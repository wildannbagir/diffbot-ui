import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Icon,
  Flex,
  Text,
  useColorModeValue,
  SimpleGrid,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Input,
  FormControl,
  FormLabel,
  useToast,
  useDisclosure,
  VStack,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
} from "@chakra-ui/react";
import Card from "components/card/Card.js";
import MapCard2D from "views/admin/dashboards/maps/components/MapCard2D";
import { MdDelete, MdMoreVert, MdMap } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import ROSLIB from 'roslib';
import {ROS_CONFIG} from 'config';

const ViewMaps = () => {
  const [maps, setMaps] = useState([]);
  const [selectedMap, setSelectedMap] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingNav, setIsLoadingNav] = useState(false);
  const [mapToDelete, setMapToDelete] = useState(null);
  const [mapToLoad, setMapToLoad] = useState(null);
  const { isOpen: isDeleteModalOpen, onOpen: onDeleteModalOpen, onClose: onDeleteModalClose } = useDisclosure();
  const { isOpen: isLoadModalOpen, onOpen: onLoadModalOpen, onClose: onLoadModalClose } = useDisclosure();
  const toast = useToast();
  const navigate = useNavigate();

  // ROS connection
  const [ros, setRos] = useState(null);

  useEffect(() => {
    const newRos = new ROSLIB.Ros({
      url: ROS_CONFIG.ROSBRIDGE_URL
    });

    newRos.on('connection', () => {
      console.log('Connected to ROSbridge');
      setRos(newRos);
    });

    newRos.on('error', (error) => {
      console.error('Error connecting to ROSbridge:', error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to ROSbridge",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    });

    newRos.on('close', () => {
      console.log('Connection to ROSbridge closed');
      toast({
        title: "Connection Closed",
        description: "Connection to ROSbridge was closed",
        status: "warning",
        duration: 5000,
        isClosable: true,
      });
    });

    setRos(newRos);

    return () => {
      if (newRos) {
        newRos.close();
      }
    };
  }, []);

  useEffect(() => {
    if (ros) {
      loadMaps();
    }
  }, [ros]);

  const loadMaps = () => {
    console.log('Attempting to load maps...');
    
    const listMapsService = new ROSLIB.Service({
      ros: ros,
      name: '/list_maps',
      serviceType: 'std_srvs/Trigger'
    });

    listMapsService.callService(new ROSLIB.ServiceRequest({}), (result) => {
      if (result.success) {
        const mapList = result.message.split(',').filter(name => name.length > 0);
        setMaps(mapList);
      } else {
        toast({
          title: "Error",
          description: "Failed to load map list",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    }, (error) => {
      console.error('Error calling list_maps service:', error);
      toast({
        title: "Service Call Error",
        description: `Error calling list_maps service: ${error.message}`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    });
  };

  const handleMapSelect = (mapName) => {
    setIsLoading(true);
    setSelectedMap(mapName);

    const loadMapService = new ROSLIB.Service({
      ros: ros,
      name: '/load_view_map',
      serviceType: 'ugv/LoadMap'
    });

    const request = new ROSLIB.ServiceRequest({
      map_name: mapName
    });

    loadMapService.callService(request, (result) => {
      setIsLoading(false);
      if (result.success) {
        toast({
          title: "Success",
          description: `Map ${mapName} loaded successfully`,
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to load map",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        setSelectedMap(null);
      }
    }, (error) => {
      console.error('Error calling load_view_map service:', error);
      setIsLoading(false);
      toast({
        title: "Error",
        description: "Failed to load map",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      setSelectedMap(null);
    });
  };

  const handleDeleteMap = (mapName) => {
    setMapToDelete(mapName);
    onDeleteModalOpen();
  };

  const handleDeleteConfirm = () => {
    // TODO: Implement map deletion when the service is available
    setIsDeleting(true);
    // For now, just show a message
    toast({
      title: "Not Implemented",
      description: "Map deletion is not yet implemented",
      status: "info",
      duration: 3000,
      isClosable: true,
    });
    setIsDeleting(false);
    onDeleteModalClose();
  };

  const handleLoadMap = (mapName) => {
    setMapToLoad(mapName);
    onLoadModalOpen();
  };

  const handleLoadConfirm = () => {
    setIsLoadingNav(true);
    const loadMapService = new ROSLIB.Service({
      ros: ros,
      name: '/load_map',
      serviceType: 'ugv/LoadMap'
    });

    const request = new ROSLIB.ServiceRequest({
      map_name: mapToLoad
    });

    loadMapService.callService(request, (result) => {
      setIsLoadingNav(false);
      onLoadModalClose();
      if (result.success) {
        toast({
          title: "Success",
          description: `Map ${mapToLoad} loaded for navigation`,
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        // Navigate back to home page where the navigation map is used
        navigate('/admin/home');
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to load map for navigation",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    }, (error) => {
      console.error('Error calling load_map service:', error);
      setIsLoadingNav(false);
      toast({
        title: "Error",
        description: "Failed to load map for navigation",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    });
  };

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <Flex direction={{ base: "column", lg: "row" }} gap='20px'>
        {/* Map List Card */}
        <Card flex={{ base: "1", lg: "0 0 400px" }} maxH={{ base: "400px", lg: "800px" }} overflow="hidden">
          <Flex direction="column" h="100%">
            <Flex justify="space-between" align="center" p={4} borderBottom="1px" borderColor="gray.100">
              <Text fontSize='xl' fontWeight='bold'>
                Saved Maps
              </Text>
            </Flex>
            <Box flex="1" overflowY="auto" p={4}>
              <VStack spacing={4} align="stretch">
                {maps.map((map, index) => (
                  <Flex
                    key={index}
                    justify="space-between"
                    align="center"
                    p={4}
                    bg={selectedMap === map ? "blue.50" : "gray.50"}
                    borderRadius="md"
                    cursor="pointer"
                    onClick={() => handleMapSelect(map)}
                    _hover={{ bg: selectedMap === map ? "blue.100" : "gray.100" }}
                    transition="background-color 0.2s"
                  >
                    <Text>{map}</Text>
                    <Flex gap={2}>
                      <Button
                        colorScheme="blue"
                        size="sm"
                        leftIcon={<Icon as={MdMap} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLoadMap(map);
                        }}
                        isDisabled={isLoading || isLoadingNav}
                      >
                        Load Map
                      </Button>
                      <Menu>
                        <MenuButton
                          as={IconButton}
                          icon={<Icon as={MdMoreVert} />}
                          variant="ghost"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <MenuList>
                          <MenuItem
                            icon={<Icon as={MdDelete} />}
                            color="red.500"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteMap(map);
                            }}
                          >
                            Delete
                          </MenuItem>
                        </MenuList>
                      </Menu>
                    </Flex>
                  </Flex>
                ))}
              </VStack>
            </Box>
          </Flex>
        </Card>

        {/* Map Card */}
        <Box flex="1" minH={{ base: "400px", lg: "800px" }} position="relative">
          <MapCard2D
            isViewOnly={true}
            isLoading={isLoading}
            mapTopic="/view_map"
          />
        </Box>
      </Flex>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={onDeleteModalClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Delete Map</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>Are you sure you want to delete the map "{mapToDelete}"?</Text>
          </ModalBody>

          <ModalFooter>
            <Button
              colorScheme="red"
              mr={3}
              onClick={handleDeleteConfirm}
              isLoading={isDeleting}
              loadingText="Deleting"
            >
              Delete
            </Button>
            <Button variant="ghost" onClick={onDeleteModalClose}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Load Map Confirmation Modal */}
      <Modal isOpen={isLoadModalOpen} onClose={onLoadModalClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Load Map for Navigation</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>Do you want to load "{mapToLoad}" as the navigation map?</Text>
            <Text mt={2} color="blue.600">
              This will set the map for robot navigation and redirect you to the home page.
            </Text>
          </ModalBody>

          <ModalFooter>
            <Button
              colorScheme="blue"
              mr={3}
              onClick={handleLoadConfirm}
              isLoading={isLoadingNav}
              loadingText="Loading"
            >
              Load Map
            </Button>
            <Button variant="ghost" onClick={onLoadModalClose}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default ViewMaps; 