export interface InteractionEntity {
  partitionKey: string;
  rowKey: string;
  timestamp?: Date;
  InteractionId: string;
  Input: string;
  Output: string;
  Href?: string;
}

export interface FeedbackEntity {
  partitionKey: string;
  rowKey: string;
  timestamp?: Date;
  InteractionId: string;
  Score: number;
  Comment?: string;
}

export interface CarbonFootprintEntity {
  partitionKey: string;
  rowKey: string;
  timestamp?: Date;
  InteractionId: string;
  UserInputLength: number;
  UserInputWordCount: number;
  SimplifiedOutputLength: number;
  SimplifiedOutputWordCount: number;
  Duration: number;
}

export interface UsageStats {
  period: string;
  count: number;
}

export interface FeedbackWithTimestamp extends FeedbackEntity {
  formattedTimestamp: string;
}
