export default function Home(): React.JSX.Element {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <div className="flex flex-col items-center">
          <h1 className="text-4xl font-bold text-center mb-8">
            Welcome to Zetra
          </h1>
          <p className="text-xl text-center text-gray-600">
            Unified Productivity Platform for Indian CA Firms
          </p>
        </div>
      </div>
    </main>
  )
}