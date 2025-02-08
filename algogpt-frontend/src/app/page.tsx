export default function Home() {
  return (
    <div className="text-center">
      <h1 className="text-4xl font-bold mb-4">Welcome to AlgoGPT</h1>
      <p className="text-xl mb-8">Learn, practice, and master coding with our curated problems and AI assistance.</p>
      <div className="flex justify-center space-x-4">
        <a href="/problems" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
          Start Practicing
        </a>
        <a href="/chat" className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded">
          Chat with AI
        </a>
      </div>
    </div>
  )
}

