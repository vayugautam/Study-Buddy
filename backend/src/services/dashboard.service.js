/**
 * @module services/dashboard
 * @description Computes real-time analytics for the user's dashboard
 * using optimized MongoDB aggregation pipelines.
 */

import Note from '../models/Note.model.js';
import Quiz from '../models/Quiz.model.js';
import FlashcardDeck from '../models/FlashcardDeck.model.js';
import Chat from '../models/Chat.model.js';
import Message from '../models/Message.model.js';

const dashboardService = {
  /**
   * Fetch all dashboard analytics metrics for a user.
   * @param {string} ownerId
   */
  async getDashboard(ownerId) {
    // We execute independent aggregation queries concurrently for performance
    const [
      notesData,
      quizStats,
      flashcardStats,
      chatStats
    ] = await Promise.all([
      this.getNotesAnalytics(ownerId),
      this.getQuizAnalytics(ownerId),
      this.getFlashcardAnalytics(ownerId),
      this.getChatAnalytics(ownerId)
    ]);

    return {
      pdfAnalytics: notesData,
      quizStatistics: quizStats,
      flashcardStatistics: flashcardStats,
      chatStatistics: chatStats
    };
  },

  async getNotesAnalytics(ownerId) {
    const totalUploads = await Note.countDocuments({ ownerId });
    
    const statusBreakdownRaw = await Note.aggregate([
      { $match: { ownerId } },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    const statusBreakdown = { ready: 0, processing: 0, error: 0 };
    statusBreakdownRaw.forEach(item => {
      statusBreakdown[item._id] = item.count;
    });

    const recentUploads = await Note.find({ ownerId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('_id title status createdAt')
      .lean();

    return {
      totalUploads,
      statusBreakdown,
      recentUploads
    };
  },

  async getQuizAnalytics(ownerId) {
    const totalAttemptsAgg = await Quiz.aggregate([
      { $match: { ownerId } },
      { $group: { _id: null, totalAttempts: { $sum: { $size: "$attempts" } }, totalQuestions: { $sum: { $size: "$questions" } } } }
    ]);

    const totalAttempts = totalAttemptsAgg[0]?.totalAttempts || 0;
    const totalQuestions = totalAttemptsAgg[0]?.totalQuestions || 0;

    const avgScoreAgg = await Quiz.aggregate([
      { $match: { ownerId } },
      { $unwind: "$attempts" },
      { $group: { _id: null, averageScore: { $avg: "$attempts.score" } } }
    ]);

    const averageScore = avgScoreAgg[0]?.averageScore != null ? Math.round(avgScoreAgg[0].averageScore) : null;

    return {
      quizzesTaken: totalAttempts,
      uniqueQuestionsGenerated: totalQuestions,
      averageScore
    };
  },

  async getFlashcardAnalytics(ownerId) {
    const totalCardsAgg = await FlashcardDeck.aggregate([
      { $match: { ownerId } },
      { $group: { _id: null, totalCards: { $sum: { $size: "$cards" } } } }
    ]);

    const totalCards = totalCardsAgg[0]?.totalCards || 0;

    const cardsByDocument = await FlashcardDeck.aggregate([
      { $match: { ownerId } },
      { $group: { _id: "$noteId", cardCount: { $sum: { $size: "$cards" } } } },
      { 
        $lookup: {
          from: 'notes',
          localField: '_id',
          foreignField: '_id',
          as: 'noteDoc'
        }
      },
      { $unwind: "$noteDoc" },
      {
        $project: {
          _id: 1,
          documentTitle: "$noteDoc.title",
          cardCount: 1
        }
      }
    ]);

    return {
      totalCards,
      cardsByDocument
    };
  },

  async getChatAnalytics(ownerId) {
    const conversationCount = await Chat.countDocuments({ ownerId });
    const messageCount = await Message.countDocuments({ ownerId, role: 'user' });

    // Activity over time (Last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const activityRaw = await Message.aggregate([
      { $match: { ownerId, timestamp: { $gte: sevenDaysAgo } } },
      { 
        $group: { 
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } }, 
          count: { $sum: 1 } 
        } 
      },
      { $sort: { _id: 1 } }
    ]);

    // Pad missing days
    const activityOverTime = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const match = activityRaw.find(a => a._id === dateStr);
      activityOverTime.push({
        date: dateStr,
        messages: match ? match.count : 0
      });
    }

    return {
      conversationCount,
      messageCount,
      activityOverTime
    };
  }
};

export default dashboardService;
