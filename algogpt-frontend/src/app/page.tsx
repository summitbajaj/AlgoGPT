import React from 'react';

export default function Home() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <h1 className="text-5xl font-bold mb-6 text-gray-800">
          Welcome to AlgoGPT
        </h1>
        <p className="text-xl max-w-3xl mx-auto mb-10 text-gray-600">
          Master data structures and algorithms with personalized AI-guided learning
          that adapts to your skill level and learning pace.
        </p>
        <div className="flex justify-center space-x-6">
          <a
            href="/problems"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-all shadow-sm"
          >
            Start Practicing
          </a>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid md:grid-cols-3 gap-8 mb-16">
        <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow border-t-4 border-blue-500 transition-all">
          <div className="text-blue-500 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-3 text-gray-800">Personalized Learning</h3>
          <p className="text-gray-600">
            Our AI analyzes your strengths and weaknesses to recommend problems
            tailored specifically to your skill level.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow border-t-4 border-teal-500 transition-all">
          <div className="text-teal-500 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-3 text-gray-800">Smart Feedback</h3>
          <p className="text-gray-600">
            Get detailed analysis of your solutions with insights on time complexity,
            space efficiency, and targeted improvement suggestions.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow border-t-4 border-amber-500 transition-all">
          <div className="text-amber-500 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20V10"></path>
              <path d="M18 20V4"></path>
              <path d="M6 20v-6"></path>
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-3 text-gray-800">Track Your Progress</h3>
          <p className="text-gray-600">
            Visualize your improvement over time with comprehensive performance
            analytics and skill progression mapping.
          </p>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="mb-16 bg-gray-50 py-12 px-6 rounded-xl">
        <h2 className="text-3xl font-bold text-center mb-10 text-gray-800">How AlgoGPT Works</h2>
        <div className="grid md:grid-cols-4 gap-6">
          <div className="flex flex-col items-center text-center bg-white p-6 rounded-xl shadow-sm">
            <div className="bg-blue-500 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mb-4">1</div>
            <h3 className="text-lg font-semibold mb-2 text-gray-800">Assessment</h3>
            <p className="text-gray-600">We analyze your current skill level with initial problems</p>
          </div>
          <div className="flex flex-col items-center text-center bg-white p-6 rounded-xl shadow-sm">
            <div className="bg-teal-500 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mb-4">2</div>
            <h3 className="text-lg font-semibold mb-2 text-gray-800">Personalization</h3>
            <p className="text-gray-600">Our AI creates a tailored learning path</p>
          </div>
          <div className="flex flex-col items-center text-center bg-white p-6 rounded-xl shadow-sm">
            <div className="bg-amber-500 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mb-4">3</div>
            <h3 className="text-lg font-semibold mb-2 text-gray-800">Practice</h3>
            <p className="text-gray-600">Solve problems with guided hints when needed</p>
          </div>
          <div className="flex flex-col items-center text-center bg-white p-6 rounded-xl shadow-sm">
            <div className="bg-blue-500 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mb-4">4</div>
            <h3 className="text-lg font-semibold mb-2 text-gray-800">Mastery</h3>
            <p className="text-gray-600">Track improvement and tackle increasingly challenging problems</p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="text-center bg-gradient-to-r from-blue-400 to-teal-400 p-10 rounded-xl text-white shadow-sm">
        <h2 className="text-3xl font-bold mb-4">Ready to master algorithms?</h2>
        <p className="text-xl mb-6 max-w-2xl mx-auto">Join AlgoGPT today and transform the way you learn data structures and algorithms with AI-guided personalized practice.</p>
        <a
          href="/problems"
          className="bg-white text-blue-500 hover:bg-blue-50 font-bold py-3 px-10 rounded-lg inline-block transition-all"
        >
          Start Practicing Now
        </a>
      </div>
    </div>
  );
}