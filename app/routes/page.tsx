import { redirect } from "next/navigation";

// The route book moved to a crag → route structure.
export default function RoutesRedirect() {
  redirect("/crags");
}
