import { cookies } from "next/headers";
import HomeClient from "./components/HomeClient";

export default function Page() {
  const cookieStore = cookies();
  const isAdmin = cookieStore.get("admin_auth")?.value === "1";

  return <HomeClient showAdmin={isAdmin} />;
}
