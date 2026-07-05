/* eslint-disable */

import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
// chakra imports
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Flex,
  HStack,
  Text,
  List,
  Icon,
  ListItem,
  useColorModeValue,
  Collapse,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  VStack,
  Portal,
} from '@chakra-ui/react';
import { ChevronDownIcon } from '@chakra-ui/icons';
// Assets
import { FaCircle } from 'react-icons/fa';

export function SidebarLinks(props) {
  //   Chakra color mode
  let location = useLocation();
  let activeColor = useColorModeValue('gray.700', 'white');
  let inactiveColor = useColorModeValue(
    'secondaryGray.600',
    'secondaryGray.600',
  );
  let activeIcon = useColorModeValue('brand.500', 'white');
  let bgHover = useColorModeValue('rgba(0, 0, 0, 0.04)', 'rgba(255, 255, 255, 0.04)');

  const { routes, hovered, mini } = props;
  const [openSections, setOpenSections] = useState({});
  const [openPopover, setOpenPopover] = useState(null);

  // verifies if routeName is the one active (in browser input)
  const activeRoute = (routeName) => {
    return location.pathname.includes(routeName);
  };

  const toggleSection = (name) => {
    setOpenSections(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  // this function creates the links and collapses that appear in the sidebar (left menu)
  const createSubLinks = (items, parentPath, closePopover) => {
    return items.map((item, index) => (
      <NavLink 
        key={index} 
        to={item.layout + item.path}
        onClick={() => {
          if (closePopover) closePopover();
        }}
      >
        <Flex
          ps="16px"
          py="8px"
          alignItems="center"
          sx={{
            '&:hover': {
              bg: bgHover
            }
          }}
          bg={activeRoute(item.path.toLowerCase()) ? bgHover : 'transparent'}
          transition="all 0.2s"
        >
          <Icon 
            as={item.icon} 
            w="32px" 
            h="32px" 
            me="16px"
            color={activeRoute(item.path.toLowerCase()) ? activeIcon : inactiveColor}
          />
          <Text
            color={activeRoute(item.path.toLowerCase()) ? 'gray.700' : inactiveColor}
            fontWeight="500"
            fontSize="md"
          >
            {item.name}
          </Text>
        </Flex>
      </NavLink>
    ));
  };

  const createLinks = (routes) => {
    return routes.map((route, index) => {
      if (route.category) {
        return (
          <Text
            fontSize="sm"
            color={inactiveColor}
            fontWeight="700"
            mx="auto"
            ps="16px"
            py="12px"
            key={index}
            display={mini && !hovered ? 'none' : 'block'}
          >
            {route.name}
          </Text>
        );
      }

      if (route.items) {
        // Section with subitems
        if (mini && !hovered) {
          // Minimized state with popup
          return (
            <Popover 
              key={index} 
              placement="right-start" 
              isLazy 
              openDelay={0} 
              closeDelay={100} 
              gutter={0} 
              strategy="fixed"
              isOpen={openPopover === route.name}
              onOpen={() => setOpenPopover(route.name)}
              onClose={() => setOpenPopover(null)}
            >
              <PopoverTrigger>
                  <Flex
                    align="center"
                  justifyContent="center"
                  py="8px"
                  cursor="pointer"
                  sx={{
                    '&:hover': {
                      bg: bgHover
                    }
                  }}
                  position="relative"
                  zIndex={1}
                  transition="all 0.2s"
                      >
                        <Box
                          color={
                      route.items.some(item => activeRoute(item.path.toLowerCase()))
                              ? activeIcon
                              : inactiveColor
                          }
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    minW="48px"
                    h="48px"
                  >
                    <Icon as={route.icon} w="32px" h="32px" />
                  </Box>
                </Flex>
              </PopoverTrigger>
              <Portal>
                <PopoverContent 
                  ml={0}
                  w="200px" 
                  bg="white" 
                  border="none" 
                  boxShadow="0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
                  borderRadius="md"
                  zIndex={9999}
                  overflow="hidden"
                  position="fixed"
                  transform="translateX(70px)"
                >
                  <PopoverBody p={0}>
                    <VStack align="stretch" spacing={0}>
                      {createSubLinks(route.items, route.path, () => setOpenPopover(null))}
                    </VStack>
                  </PopoverBody>
                </PopoverContent>
              </Portal>
            </Popover>
          );
        }

        // Expanded state with collapsible sections
        return (
          <Box key={index}>
            <Flex
              align="center"
              justifyContent="space-between"
              w="100%"
              ps="16px"
              py="8px"
              cursor="pointer"
              onClick={() => toggleSection(route.name)}
              _hover={{ bg: bgHover }}
            >
              <HStack spacing="22px">
                <Box
                  color={activeRoute(route.path) ? activeIcon : inactiveColor}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  minW="48px"
                  h="48px"
                >
                  <Icon as={route.icon} w="32px" h="32px" />
                        </Box>
                        <Text
                  color={activeRoute(route.path) ? 'gray.700' : inactiveColor}
                          fontWeight="500"
                          fontSize="md"
                        >
                          {route.name}
                        </Text>
                    </HStack>
              <Icon 
                as={ChevronDownIcon}
                w="20px"
                h="20px"
                transform={openSections[route.name] ? 'rotate(180deg)' : 'none'}
                transition="transform 0.2s"
                me="8px"
                    />
                  </Flex>
            <Collapse in={openSections[route.name]}>
              <VStack align="stretch" spacing={0} ps="12px">
                {createSubLinks(route.items, route.path, () => setOpenPopover(null))}
              </VStack>
            </Collapse>
          </Box>
        );
      }

      // Regular route without subitems
      if (route.layout === '/admin' || route.layout === '/auth') {
        return (
          <NavLink key={index} to={route.layout + route.path}>
              <Flex
                align="center"
                justifyContent="space-between"
              w="100%"
              ps={mini && !hovered ? '0px' : '16px'}
              py="8px"
              _hover={{ bg: bgHover }}
            >
              <HStack 
                spacing={mini && !hovered ? '0px' : '22px'}
                w="100%"
                justifyContent={mini && !hovered ? 'center' : 'flex-start'}
              >
                <Box
                  color={activeRoute(route.path.toLowerCase()) ? activeIcon : inactiveColor}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  minW="48px"
                  h="48px"
                >
                  <Icon as={route.icon} w="32px" h="32px" />
                </Box>
                  <Text
                  display={mini && !hovered ? 'none' : 'block'}
                  color={activeRoute(route.path.toLowerCase()) ? 'gray.700' : inactiveColor}
                    fontWeight="500"
                  fontSize="md"
                >
                  {route.name}
                  </Text>
              </HStack>
                </Flex>
          </NavLink>
        );
      }
      return null;
    });
  };

  // this function creates the links from the secondary accordions (for example auth -> sign-in -> default)
  const createAccordionLinks = (routes) => {
    return routes.map((route, key) => {
      return (
        <NavLink to={route.layout + route.path} key={key}>
          <ListItem
            ms={
              mini === false
                ? '28px'
                : mini === true && hovered === true
                ? '28px'
                : '0px'
            }
            display="flex"
            alignItems="center"
            mb="10px"
            key={key}
          >
            <Icon w="6px" h="6px" me="8px" as={FaCircle} color={activeIcon} />
            <Text
              color={
                activeRoute(route.path.toLowerCase())
                  ? activeColor
                  : inactiveColor
              }
              fontWeight={
                activeRoute(route.path.toLowerCase()) ? 'bold' : 'normal'
              }
              fontSize="sm"
            >
              {mini === false
                ? route.name
                : mini === true && hovered === true
                ? route.name
                : route.name[0]}
            </Text>
          </ListItem>
        </NavLink>
      );
    });
  };
  //  BRAND
  return <>{createLinks(routes)}</>;
}

export default SidebarLinks;
