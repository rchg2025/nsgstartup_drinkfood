export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[50vh] w-full">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-gray-300 border-t-primary rounded-full animate-spin"></div>
        <p className="text-muted-foreground animate-pulse">Ðang t?i d? li?u...</p>
      </div>
    </div>
  );
}
