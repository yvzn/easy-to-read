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
	timestamp?: string;
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

export interface InteractionWithTimestamp extends InteractionEntity {
	formattedTimestamp: string;
}

export interface MonitoringEntity {
	partitionKey: string;
	rowKey: string;
	timestamp?: Date;
	Duration: number;
	Error?: string;
}

export interface MonitoringStats {
	period: string;
	avgDuration: number;
	medianDuration: number;
	p95Duration: number;
	p99Duration: number;
}
