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
import ReviewPage from "@/pages/review";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
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
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
