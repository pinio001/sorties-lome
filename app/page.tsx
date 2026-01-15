import { cookies } from "next/headers";
import HomeClient from "./components/HomeClient";

export default async function Page() {
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get("admin_auth")?.value === "1";

  return <HomeClient showAdmin={isAdmin} />;
}
