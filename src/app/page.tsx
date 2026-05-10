import { HomeView } from "@/components/home-view";
import { SplashScreen } from "@/components/splash-screen";

export default function Home() {
  return (
    <main className="relative flex flex-1 flex-col">
      <SplashScreen />
      <HomeView />
    </main>
  );
}
