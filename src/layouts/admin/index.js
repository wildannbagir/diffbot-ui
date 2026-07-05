// Chakra imports
import {
  Portal,
  Box,
  useDisclosure,
  useColorModeValue,
} from '@chakra-ui/react';
import Footer from 'components/footer/FooterAdmin';
// Layout components
import Navbar from 'components/navbar/NavbarAdmin';
import Sidebar from 'components/sidebar/Sidebar';
import { SidebarContext } from 'contexts/SidebarContext';
import { useState, useEffect } from 'react';
import { Route, Routes, Navigate, useLocation } from 'react-router-dom';
import routes from 'routes';

// Custom Chakra theme
export default function Dashboard(props) {
  const { ...rest } = props;
  // states and functions
  const [fixed] = useState(false);
  const [toggleSidebar, setToggleSidebar] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentBrandText, setCurrentBrandText] = useState('Home');
  const location = useLocation();

  // Update brandText when route changes
  useEffect(() => {
    setCurrentBrandText(getActiveRoute(routes));
  }, [location.pathname]);

  // functions for changing the states from components
  const getRoute = () => {
    return window.location.pathname !== '/admin/full-screen-maps';
  };
  const getActiveRoute = (routes) => {
    let activeRoute = 'Home';
    for (let i = 0; i < routes.length; i++) {
      if (routes[i].items) {
        let collapseActiveRoute = getActiveRoute(routes[i].items);
        if (collapseActiveRoute !== activeRoute) {
          return collapseActiveRoute;
        }
      } else if (window.location.href.indexOf(routes[i].layout + routes[i].path) !== -1) {
        return routes[i].name;
      }
    }
    return activeRoute;
  };
  const getActiveNavbar = (routes) => {
    let activeNavbar = false;
    for (let i = 0; i < routes.length; i++) {
      if (routes[i].items) {
        let collapseActiveNavbar = getActiveNavbar(routes[i].items);
        if (collapseActiveNavbar !== activeNavbar) {
          return collapseActiveNavbar;
        }
      } else if (window.location.href.indexOf(routes[i].layout + routes[i].path) !== -1) {
        return routes[i].secondary;
      }
    }
    return activeNavbar;
  };
  const getRoutes = (routes) => {
    return routes.map((route, key) => {
      if (route.items) {
        return route.items.map((item, itemKey) => {
          if (item.layout === '/admin') {
            const Component = item.component;
            return (
              <Route
                path={`${item.path}`}
                element={<Component />}
                key={`${key}-${itemKey}`}
              />
            );
          }
          return null;
        });
      }
      if (route.layout === '/admin') {
        const Component = route.component;
        return (
          <Route
            path={`${route.path}`}
            element={<Component />}
            key={key}
          />
        );
      }
      return null;
    });
  };

  document.documentElement.dir = 'ltr';
  const { onOpen } = useDisclosure();
  const bg = useColorModeValue('background.100', 'background.900');
  return (
    <Box bg={bg} h="100vh" w="100vw">
      <SidebarContext.Provider
        value={{
          toggleSidebar,
          setToggleSidebar,
        }}
      >
        <Sidebar
          routes={routes}
          display="none"
          onExpandedChange={setIsExpanded}
          {...rest}
        />
        <Box
          float="right"
          minHeight="100vh"
          height="100%"
          overflow="auto"
          position="relative"
          maxHeight="100%"
          w={{ base: '100%', xl: `calc(100% - ${isExpanded ? '290px' : '120px'})` }}
          maxWidth={{ base: '100%', xl: `calc(100% - ${isExpanded ? '290px' : '120px'})` }}
          transition="all 0.33s cubic-bezier(0.685, 0.0473, 0.346, 1)"
          transitionDuration=".2s, .2s, .35s"
          transitionProperty="top, bottom, width"
          transitionTimingFunction="linear, linear, ease"
        >
          <Portal>
            <Box>
              <Navbar
                onOpen={onOpen}
                logoText={'Horizon UI Dashboard PRO'}
                brandText={currentBrandText}
                secondary={getActiveNavbar(routes)}
                theme={props.theme}
                setTheme={props.setTheme}
                fixed={fixed}
                isExpanded={isExpanded}
                {...rest}
              />
            </Box>
          </Portal>

          {getRoute() ? (
            <Box
              mx="auto"
              p={{ base: '20px', md: '30px' }}
              pe="20px"
              minH="100vh"
              pt="50px"
            >
              <Routes>
                {getRoutes(routes)}
                <Route
                  path="/"
                  element={<Navigate to="/admin/home" replace />}
                />
              </Routes>
            </Box>
          ) : null}
          <Box>
            {/* <Footer /> */}
          </Box>
        </Box>
      </SidebarContext.Provider>
    </Box>
  );
}
