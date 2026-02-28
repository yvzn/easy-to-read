import { TableClient } from '@azure/data-tables';
import { config } from '../config/index.js';
import {
  CarbonFootprintEntity,
  FeedbackEntity,
  InteractionEntity,
  UsageStats,
} from '../types/index.js';

function getISOWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

class StorageService {
  private getClient(tableName: string): TableClient {
    return TableClient.fromConnectionString(config.storageConnectionString, tableName);
  }

  async getCarbonFootprintStats(interval: 'week' | 'month' | 'year'): Promise<UsageStats[]> {
    const client = this.getClient('CarbonFootprint');
    const counts = new Map<string, number>();
    const now = new Date();

    for await (const entity of client.listEntities<CarbonFootprintEntity>()) {
      const ts = entity.timestamp ? new Date(entity.timestamp) : new Date();
      let key: string;

      if (interval === 'week') {
        key = getISOWeek(ts);
      } else if (interval === 'month') {
        key = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, '0')}`;
      } else {
        key = String(ts.getFullYear());
      }

      counts.set(key, (counts.get(key) || 0) + 1);
    }

    // Determine cutoff
    const cutoffDate = new Date(now);
    if (interval === 'week') {
      cutoffDate.setDate(cutoffDate.getDate() - 52 * 7);
    } else if (interval === 'month') {
      cutoffDate.setMonth(cutoffDate.getMonth() - 24);
    } else {
      cutoffDate.setFullYear(cutoffDate.getFullYear() - 10);
    }

    const cutoffKey =
      interval === 'week'
        ? getISOWeek(cutoffDate)
        : interval === 'month'
          ? `${cutoffDate.getFullYear()}-${String(cutoffDate.getMonth() + 1).padStart(2, '0')}`
          : String(cutoffDate.getFullYear());

    const result: UsageStats[] = [];
    for (const [period, count] of counts.entries()) {
      if (period >= cutoffKey) {
        result.push({ period, count });
      }
    }

    return result.sort((a, b) => a.period.localeCompare(b.period));
  }

  async getFeedbacks(filter?: string): Promise<FeedbackEntity[]> {
    const client = this.getClient('Feedbacks');
    const feedbacks: FeedbackEntity[] = [];

    for await (const entity of client.listEntities<FeedbackEntity>()) {
      feedbacks.push(entity as FeedbackEntity);
    }

    if (filter && filter.trim()) {
      const lowerFilter = filter.trim().toLowerCase();
      return feedbacks.filter(
        (f) =>
          (f.Comment && f.Comment.toLowerCase().includes(lowerFilter)) ||
          (f.InteractionId && f.InteractionId.toLowerCase().includes(lowerFilter))
      );
    }

    return feedbacks;
  }

  async deleteFeedback(partitionKey: string, rowKey: string): Promise<void> {
    const client = this.getClient('Feedbacks');
    await client.deleteEntity(partitionKey, rowKey);
  }

  async getOldInteractions(beforeDate: Date): Promise<InteractionEntity[]> {
    const client = this.getClient('Interactions');
    const interactions: InteractionEntity[] = [];

    for await (const entity of client.listEntities<InteractionEntity>()) {
      const ts = entity.timestamp ? new Date(entity.timestamp) : new Date();
      if (ts < beforeDate) {
        interactions.push(entity as InteractionEntity);
      }
    }

    return interactions;
  }

  async deleteInteractions(
    interactions: InteractionEntity[],
    keepWithFeedback: boolean
  ): Promise<{ deleted: number; skipped: number }> {
    let deleted = 0;
    let skipped = 0;

    let feedbackInteractionIds = new Set<string>();
    if (keepWithFeedback) {
      const feedbackClient = this.getClient('Feedbacks');
      for await (const entity of feedbackClient.listEntities<FeedbackEntity>()) {
        if (entity.InteractionId) {
          feedbackInteractionIds.add(entity.InteractionId);
        }
      }
    }

    const interactionClient = this.getClient('Interactions');
    for (const interaction of interactions) {
      if (keepWithFeedback && feedbackInteractionIds.has(interaction.InteractionId)) {
        skipped++;
        continue;
      }
      await interactionClient.deleteEntity(interaction.partitionKey, interaction.rowKey);
      deleted++;
    }

    return { deleted, skipped };
  }
}

export const storageService = new StorageService();
