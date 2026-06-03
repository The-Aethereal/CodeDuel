import { prisma } from '@codeduel/database';
import { io } from '../index';

// Standard ELO variables
const K_FACTOR = 32;

function calculateExpectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export async function resolveDuel(roomId: string, winnerId: string) {
  try {
    // 1. Transaction to prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      // Lock and check the room
      const room = await tx.duelRoom.findUnique({
        where: { id: roomId },
        include: { participants: { include: { user: true } } }
      });

      if (!room) throw new Error("Room not found");
      
      // RACE CONDITION CHECK: If someone else already won, abort.
      if (room.status === 'FINISHED') {
        return { alreadyFinished: true };
      }

      // 2. Identify Winner and Loser
      const winnerParticipant = room.participants.find(p => p.user_id === winnerId);
      const loserParticipant = room.participants.find(p => p.user_id !== winnerId);

      if (!winnerParticipant || !loserParticipant) {
        throw new Error("Invalid participants");
      }

      const winner = winnerParticipant.user;
      const loser = loserParticipant.user;

      // 3. ELO Math Calculation
      const expectedWinner = calculateExpectedScore(winner.duel_elo, loser.duel_elo);
      const expectedLoser = calculateExpectedScore(loser.duel_elo, winner.duel_elo);

      // Score: Winner = 1, Loser = 0
      const winnerEloChange = Math.round(K_FACTOR * (1 - expectedWinner));
      const loserEloChange = Math.round(K_FACTOR * (0 - expectedLoser)); // This will be negative

      const newWinnerElo = winner.duel_elo + winnerEloChange;
      const newLoserElo = Math.max(0, loser.duel_elo + loserEloChange); // Floor at 0

      // 4. Update the Database Atomically
      await tx.duelRoom.update({
        where: { id: roomId },
        data: { 
          status: 'FINISHED', 
          winner_id: winnerId,
          ended_at: new Date()
        }
      });

      // Update Winner
      await tx.user.update({
        where: { id: winner.id },
        data: { duel_elo: newWinnerElo }
      });
      await tx.matchHistory.create({
        data: {
          user_id: winner.id,
          opponent_id: loser.id,
          room_id: roomId,
          result: 'win',
          elo_change: winnerEloChange,
          new_elo: newWinnerElo
        }
      });

      // Update Loser
      await tx.user.update({
        where: { id: loser.id },
        data: { duel_elo: newLoserElo }
      });
      await tx.matchHistory.create({
        data: {
          user_id: loser.id,
          opponent_id: winner.id,
          room_id: roomId,
          result: 'loss',
          elo_change: loserEloChange,
          new_elo: newLoserElo
        }
      });

      return {
        alreadyFinished: false,
        roomCode: room.code,
        winnerId: winner.id,
        loserId: loser.id,
        winnerEloChange,
        loserEloChange
      };
    });

    // 5. Broadcast to connected clients to trigger Podium Screen redirect
    if (result && !result.alreadyFinished) {
      io.to(`room_${result.roomCode}`).emit('duel_finished', {
        winnerId: result.winnerId,
        loserId: result.loserId,
      });
    }

    return result;
  } catch (error) {
    console.error("❌ Failed to resolve duel:", error);
  }
}