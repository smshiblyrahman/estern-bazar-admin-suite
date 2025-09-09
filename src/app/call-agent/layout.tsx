export default function CallAgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="px-6 py-4">
          <h1 className="text-xl font-semibold text-gray-900">Call Agent Portal</h1>
          <p className="text-sm text-gray-600">Customer confirmation and order management</p>
        </div>
      </div>
      <main>{children}</main>
    </div>
  );
}
