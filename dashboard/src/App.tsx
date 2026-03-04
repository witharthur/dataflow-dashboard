import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DateRangeProvider } from "@/context/DateRangeContext";
import { ThemeProvider } from "@/components/theme-provider";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import Overview from "@/pages/Overview";
import EventAnalytics from "@/pages/EventAnalytics";
import Sessions from "@/pages/Sessions";
import SessionDetail from "@/pages/SessionDetail";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();
const currentYear = new Date().getFullYear();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <DateRangeProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <div className="flex h-screen overflow-hidden bg-background">
              <Sidebar />
              <div className="flex flex-col flex-1 overflow-hidden">
                <Navbar />
                <main className="flex-1 overflow-y-auto">
                  <Routes>
                    <Route path="/" element={<Overview />} />
                    <Route path="/events" element={<EventAnalytics />} />
                    <Route path="/sessions" element={<Sessions />} />
                    <Route path="/sessions/:session_id" element={<SessionDetail />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
                <footer className="shrink-0 border-t border-border bg-card/50 px-4 md:px-6 py-2 text-[11px] text-muted-foreground font-mono">
                  Created by Arthur Dadalian. Copyright © {currentYear} Arthur Dadalian. All rights reserved.
                </footer>
              </div>
            </div>
          </BrowserRouter>
        </DateRangeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
