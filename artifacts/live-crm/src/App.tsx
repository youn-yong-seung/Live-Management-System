import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";

import Home from "@/pages/home";
import Lives from "@/pages/lives";
import Replays from "@/pages/replays";
import Courses from "@/pages/courses";
import Resources from "@/pages/resources";
import TechTree from "@/pages/techtree";
import Admin from "@/pages/admin";
import VideoFactory from "@/pages/video-factory";
import ReviewPage from "@/pages/review";
import EditorPortal from "@/pages/editor-portal";
import RegisterPage from "@/pages/register";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function MainRouter() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/lives" component={Lives} />
        <Route path="/lives/:id/review" component={ReviewPage} />
        <Route path="/replays" component={Replays} />
        <Route path="/courses" component={Courses} />
        <Route path="/resources" component={Resources} />
        <Route path="/techtree" component={TechTree} />
        <Route path="/video-factory" component={VideoFactory} />
        <Route path="/admin" component={Admin} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Switch>
            {/* Independent layout pages */}
            <Route path="/editor" component={EditorPortal} />
            <Route path="/lives/:id/register" component={RegisterPage} />
            {/* Main site */}
            <Route>{() => <MainRouter />}</Route>
          </Switch>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
