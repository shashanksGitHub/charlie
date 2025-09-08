import { Route, useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { ReactNode } from "react";

// Animation variants for page transitions
const pageVariants = {
  initial: {
    opacity: 0,
    x: "100%",
    scale: 0.95
  },
  in: {
    opacity: 1,
    x: 0,
    scale: 1
  },
  out: {
    opacity: 0,
    x: "-100%",
    scale: 0.95
  }
};

const pageTransition = {
  type: "tween",
  ease: "anticipate",
  duration: 0.5
};

interface AnimatedRouteProps {
  path: string;
  component: React.ComponentType<any>;
  exact?: boolean;
}

export function AnimatedRoute({ path, component: Component, exact }: AnimatedRouteProps) {
  const [location] = useLocation();
  const isMatch = exact ? location === path : location.startsWith(path);

  return (
    <Route path={path}>
      <AnimatePresence mode="wait">
        {isMatch && (
          <motion.div
            key={path}
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
            className="absolute w-full min-h-[calc(100vh-120px)]"
          >
            <Component />
          </motion.div>
        )}
      </AnimatePresence>
    </Route>
  );
}

interface AnimatedProtectedRouteProps {
  path: string;
  component: React.ComponentType<any>;
  protectedComponent: React.ComponentType<any>;
  exact?: boolean;
}

export function AnimatedProtectedRoute({ 
  path, 
  component: Component, 
  protectedComponent: ProtectedComponent,
  exact 
}: AnimatedProtectedRouteProps) {
  const [location] = useLocation();
  const isMatch = exact ? location === path : location.startsWith(path);

  return (
    <Route path={path}>
      <ProtectedComponent>
        <AnimatePresence mode="wait">
          {isMatch && (
            <motion.div
              key={path}
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
              className="absolute w-full min-h-[calc(100vh-120px)]"
            >
              <Component />
            </motion.div>
          )}
        </AnimatePresence>
      </ProtectedComponent>
    </Route>
  );
}