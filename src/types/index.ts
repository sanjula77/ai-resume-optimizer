export interface FeedbackItem {
  type: 'success' | 'warning';
  message: string;
}

export interface AnalysisResult {
  score: number;
  feedback: FeedbackItem[];
}