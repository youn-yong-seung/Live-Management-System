import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { AuthProvider } from "@/lib/auth";

import Home from "@/pages/home";
import Lives from "@/pages/lives";
import Replays from "@/pages/replays";
import Courses from "@/pages/courses";
import Resources from "@/pages/resources";
import FreeGuideNanoBanana from "@/pages/free-guide-nano-banana";
import Community from "@/pages/community";
import CommunityNew from "@/pages/community-new";
import CommunityDetail from "@/pages/community-detail";
import TechTree from "@/pages/techtree";
import Admin from "@/pages/admin";
import AdminResources from "@/pages/admin-resources";
import VideoFactory from "@/pages/video-factory";
import VideoFactoryDetail from "@/pages/video-factory-detail";
import ReviewPage from "@/pages/review";
import EditorPortal from "@/pages/editor-portal";
import RegisterPage from "@/pages/register";
import LiveDashboard from "@/pages/live-dashboard";
import Afterparty from "@/pages/afterparty";
import Login from "@/pages/login";
import AuthCallback from "@/pages/auth-callback";
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
        <Route path="/resources/nano-banana-vs-duct-tape" component={FreeGuideNanoBanana} />
        <Route path="/community" component={Community} />
        <Route path="/community/new" component={CommunityNew} />
        <Route path="/community/:id" component={CommunityDetail} />
        <Route path="/techtree" component={TechTree} />
        <Route path="/video-factory" component={VideoFactory} />
        <Route path="/video-factory/:id" component={VideoFactoryDetail} />
        <Route path="/admin" component={Admin} />
        <Route path="/admin/resources" component={AdminResources} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Switch>
            {/* Independent layout pages */}
            <Route path="/login" component={Login} />
            <Route path="/auth/callback" component={AuthCallback} />
            <Route path="/editor" component={EditorPortal} />
            <Route path="/lives/:id/register" component={RegisterPage} />
            <Route path="/lives/:id/dashboard" component={LiveDashboard} />
            <Route path="/lives/:id/after" component={Afterparty} />
            {/* Main site */}
            <Route>{() => <MainRouter />}</Route>
          </Switch>
        </WouterRouter>
        <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
