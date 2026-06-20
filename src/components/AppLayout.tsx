import { Outlet } from "react-router";
import { NavBar } from "@/components/NavBar";

export function AppLayout() {
  return (
    <>
      <NavBar />
      <Outlet />
    </>
  );
}
