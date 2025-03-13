import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Download, Briefcase, Loader2 } from 'lucide-react';
import { analyzeResume } from './lib/api';
import toast from 'react-hot-toast';
import type { AnalysisResult } from './types';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [showFullMessageIndex, setShowFullMessageIndex] = useState<number | null>(null); // Store index for "See More"

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (uploadedFile) {
      if (uploadedFile.type !== 'application/pdf') {
        toast.error('Please upload a PDF file');
        return;
      }
      if (uploadedFile.size > 5 * 1024 * 1024) {  // 5MB in bytes
        toast.error('File size exceeds 5MB');
        return;
      }
      setFile(uploadedFile);
      toast.success('Resume uploaded successfully');
    }
  };

  const handleAnalyze = async () => {
    if (!file) {
      toast.error('Please upload a resume first');
      return;
    }

    setIsAnalyzing(true);
    try {
      const analysisResult = await analyzeResume(file, jobDescription || undefined);
      // Ensure we're setting a plain object
      setResult({
        score: analysisResult.score,
        feedback: analysisResult.feedback.map(item => ({
          type: item.type,
          message: item.message
        }))
      });
      toast.success('Analysis completed successfully');
    } catch (error) {
      console.error('Analysis failed:', error);
      toast.error('Failed to analyze resume. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const downloadReport = () => {
    const reportContent = `Resume Analysis Report\n\nScore: ${result?.score}/100\n\nFeedback:\n${result?.feedback.map(
      (item) => `${item.type === 'success' ? '✔' : '⚠'} ${item.message}` 
    ).join('\n')}`;
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'resume-analysis-report.txt';
    link.click();
    URL.revokeObjectURL(url); // Clean up
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-indigo-900 mb-4">AI Resume Optimizer</h1>
          <p className="text-lg text-gray-600">Enhance your resume with AI-powered insights</p>
        </header>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center">
              <FileText className="mr-2" /> Upload Resume
            </h2>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
                id="resume-upload"
              />
              <label
                htmlFor="resume-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <Upload className="w-12 h-12 text-indigo-500 mb-4" />
                <span className="text-gray-600">
                  {file ? file.name : 'Drop your resume here or click to upload'}
                </span>
                <span className="text-sm text-gray-500 mt-2">
                  Supports PDF files only (Max 5MB)
                </span>
              </label>
            </div>

            <div className="mt-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <Briefcase className="mr-2" /> Job Description
              </h3>
              <textarea
                className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Paste the job description here for targeted analysis..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                maxLength={1000}
              />
              <div className="text-sm text-gray-500 text-right mt-2">{jobDescription.length}/1000</div>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={!file || isAnalyzing}
              className={`mt-6 w-full py-3 px-6 rounded-lg text-white font-semibold
                ${!file || isAnalyzing ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            >
              {isAnalyzing ? (
                <span className="flex justify-center items-center">
                  <Loader2 className="animate-spin mr-2" /> Analyzing...
                </span>
              ) : (
                'Analyze Resume'
              )}
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Analysis Results</h2>
            
            {result ? (
              <div>
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-medium">Resume Score</span>
                    <span className="text-2xl font-bold text-indigo-600">{result.score}/100</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-indigo-600 h-2.5 rounded-full"
                      style={{ width: `${result.score}%` }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-4">
                  {result.feedback.map((item, index) => {
                    const isLongMessage = item.message.length > 100;
                    return (
                      <div key={index} className={`p-4 rounded-lg flex items-start ${item.type === 'success' ? 'bg-green-50' : 'bg-amber-50'}`}>
                        {item.type === 'success' ? (
                          <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 mr-3 flex-shrink-0" />
                        )}
                        <span className={item.type === 'success' ? 'text-green-700' : 'text-amber-700'}>
                          {showFullMessageIndex === index || !isLongMessage
                            ? item.message
                            : `${item.message.substring(0, 100)}...`}
                        </span>
                        {isLongMessage && showFullMessageIndex !== index && (
                          <button onClick={() => setShowFullMessageIndex(index)} className="text-blue-500 ml-2">
                            See More
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={downloadReport}
                  className="mt-6 w-full py-3 px-6 rounded-lg border-2 border-indigo-600 text-indigo-600 font-semibold hover:bg-indigo-50 flex items-center justify-center"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Download Full Report
                </button>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-12">
                Upload your resume and add a job description to get started
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
