import axios from 'axios';
import type { AnalysisResult } from '../types';

const API_BASE_URL = 'http://localhost:8000';

export const analyzeResume = async (
  file: File,
  jobDescription?: string
): Promise<AnalysisResult> => {
  const formData = new FormData();
  formData.append('file', file);
  
  if (jobDescription) {
    formData.append('job_description', jobDescription);
  }

  try {
    const response = await axios.post<AnalysisResult>(
      `${API_BASE_URL}/analyze-resume`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    // Ensure we're returning a plain object with the correct shape
    return {
      score: Number(response.data.score),
      feedback: response.data.feedback.map(item => ({
        type: item.type as 'success' | 'warning',
        message: String(item.message)
      }))
    };
  } catch (error) {
    console.error('API Error:', error);
    throw new Error('Failed to analyze resume');
  }
};