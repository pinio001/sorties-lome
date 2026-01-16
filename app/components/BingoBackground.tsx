export default function BingoBackground() {
  return (
    <div className="fixed inset-0 -z-10 bg-black">
      <div
        className="absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(600px 600px at 20% 10%, rgba(30,58,138,0.55), transparent 60%), radial-gradient(700px 700px at 90% 20%, rgba(2,6,23,0.6), transparent 55%), linear-gradient(to bottom, rgba(0,0,0,1), rgba(0,0,0,1))",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/0 to-black" />
    </div>
  );
}
