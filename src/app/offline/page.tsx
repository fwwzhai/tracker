export default function Offline() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-end px-4 pb-24">
      <p className="label">Offline</p>
      <h1 className="num mt-2 text-4xl">No connection yet.</h1>
      <p className="mt-3 text-muted">
        Open the app once while online and today stays readable offline. Expenses you add are queued and sync later.
      </p>
    </main>
  );
}
