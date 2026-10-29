import { Suspense } from "react";
import { ExploreScreen } from "@/components/screens/ExploreScreen";
import { Loader } from "@/components/ui/Primitives";
export default function Page() {
  return (
    <Suspense fallback={<Loader />}>
      <ExploreScreen />
    </Suspense>
  );
}
