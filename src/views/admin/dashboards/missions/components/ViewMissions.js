import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Icon,
  Flex,
  Text,
  useColorModeValue,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
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
  Switch,
  HStack,
} from "@chakra-ui/react";
import Card from "components/card/Card.js";
import MapCard2D from "views/admin/dashboards/missions/components/MapCard2D";
import { MdDelete, MdList, MdPlayArrow, MdMoreVert, MdEdit, MdEditOff, MdEditNote, MdClose } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import ROSLIB from 'roslib';
import {ROS_CONFIG} from 'config';
// import ServiceTestCard from './ServiceTestCard';

const ViewMissions = () => {
  console.log('ViewPaths component is rendering');

  const textColorSecondary = useColorModeValue("secondaryGray.700", "white");
  const [paths, setPaths] = useState([]);
  const [selectedPath, setSelectedPath] = useState(null);
  const [selectedPathWaypoints, setSelectedPathWaypoints] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isViewOnly, setIsViewOnly] = useState(true);
  const [pathToDelete, setPathToDelete] = useState(null);
  const [pathToRun, setPathToRun] = useState(null);
  const [pathToEdit, setPathToEdit] = useState(null);
  const { isOpen: isDeleteModalOpen, onOpen: onDeleteModalOpen, onClose: onDeleteModalClose } = useDisclosure();
  const { isOpen: isRunModalOpen, onOpen: onRunModalOpen, onClose: onRunModalClose } = useDisclosure();
  const { isOpen: isEditModalOpen, onOpen: onEditModalOpen, onClose: onEditModalClose } = useDisclosure();
  const toast = useToast();
  const navigate = useNavigate();

  // ROS connection
  const [ros, setRos] = useState(null);

  useEffect(() => {
    console.log('ViewPaths component mounted');
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
      loadPaths();
    }
  }, [ros]);

  const loadPaths = () => {
    console.log('Attempting to load missions...');
    
    // Create a service client
    const serviceClient = new ROSLIB.Service({
      ros: ros,
      name: '/list_missions',
      serviceType: 'path_execute/ListMissions'
    });

    // Create a request with an empty filter to get all missions
    const request = new ROSLIB.ServiceRequest({
      filter: ''
    });

    // Call the service
    serviceClient.callService(request, (result) => {
      console.log('Received response from /list_missions:', result);
      if (result.success) {
        console.log('Setting missions:', result.missions);
        setPaths(result.missions);
      } else {
        console.error('Failed to load missions:', result.message);
        toast({
          title: "Error",
          description: result.message || "Failed to load missions",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    }, (error) => {
      console.error('Error calling /list_missions service:', error);
      toast({
        title: "Service Call Error",
        description: `Error calling /list_missions service: ${error.message}`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    });
  };

  const handlePathSelect = (pathName) => {
    setIsLoading(true);
    const getMissionService = new ROSLIB.Service({
      ros: ros,
      name: '/get_mission',
      serviceType: 'path_execute/GetMission'
    });

    const request = new ROSLIB.ServiceRequest({
      mission_name: pathName
    });

    getMissionService.callService(request, (result) => {
      setIsLoading(false);
      if (result.success) {
        setSelectedPath(pathName);
        // Format waypoints to match the expected structure
        const formattedWaypoints = result.waypoints.map((waypoint, index) => {
          // Convert quaternion to angle
          const q = waypoint.orientation;
          const angle = Math.atan2(
            2.0 * (q.w * q.z + q.x * q.y),
            1.0 - 2.0 * (q.y * q.y + q.z * q.z)
          );

          return {
            position: {
              x: waypoint.position.x,
              y: waypoint.position.y,
              z: waypoint.position.z
            },
            orientation: angle,
            sprayerEnabled: result.sprayer_states[index]
          };
        });
        // Ensure we're setting a new array reference to trigger a re-render
        setSelectedPathWaypoints([...formattedWaypoints]);
      } else {
        toast({
          title: "Error",
          description: "Failed to load mission data",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    });
  };

  const handleDeletePath = (pathName) => {
    setPathToDelete(pathName);
    onDeleteModalOpen();
  };

  const handleDeleteConfirm = () => {
    setIsDeleting(true);
    const deleteMissionService = new ROSLIB.Service({
      ros: ros,
      name: '/delete_mission',
      serviceType: 'path_execute/DeleteMission'
    });

    const request = new ROSLIB.ServiceRequest({
      mission_name: pathToDelete
    });

    deleteMissionService.callService(request, (result) => {
      setIsDeleting(false);
      onDeleteModalClose();
      if (result.success) {
        toast({
          title: "Success",
          description: "Mission deleted successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        loadPaths();
        if (selectedPath === pathToDelete) {
          setSelectedPath(null);
          setSelectedPathWaypoints([]);
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to delete mission",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    });
  };

  const handleRunPath = (pathName) => {
    setPathToRun(pathName);
    onRunModalOpen();
  };

  const handleRunConfirm = () => {
    setIsRunning(true);
    const runMissionService = new ROSLIB.Service({
      ros: ros,
      name: '/run_mission',
      serviceType: 'path_execute/RunMission'
    });

    const request = new ROSLIB.ServiceRequest({
      mission_name: pathToRun
    });

    runMissionService.callService(request, (result) => {
      setIsRunning(false);
      onRunModalClose();
      if (result.success) {
        toast({
          title: "Success",
          description: "Mission execution started",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        // Navigate back to home page
        navigate('/admin/home');
      } else {
        toast({
          title: "Error",
          description: "Failed to execute mission",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    });
  };

  const handleEditPath = (pathName) => {
    setPathToEdit(pathName);
    setIsViewOnly(false);
  };

  const handleSaveChanges = () => {
    onEditModalOpen();
  };

  const handleEditConfirm = () => {
    setIsEditing(true);
    const saveMissionService = new ROSLIB.Service({
      ros: ros,
      name: '/save_mission',
      serviceType: 'path_execute/SaveMission'
    });

    // Format waypoints and collect sprayer states
    const formattedWaypoints = [];
    const sprayerStates = [];

    selectedPathWaypoints.forEach(wp => {
      // Convert orientation angle to quaternion
      const angle = wp.orientation;
      const quaternion = {
        x: 0.0,
        y: 0.0,
        z: Math.sin(angle / 2),
        w: Math.cos(angle / 2)
      };

      // Create a proper geometry_msgs/Pose message
      formattedWaypoints.push(
        new ROSLIB.Message({
          position: {
            x: wp.position.x,
            y: wp.position.y,
            z: 0.0
          },
          orientation: quaternion
        })
      );

      sprayerStates.push(wp.sprayerEnabled || false);
    });

    const request = new ROSLIB.ServiceRequest({
      mission_name: pathToEdit,
      waypoints: formattedWaypoints,
      sprayer_states: sprayerStates
    });

    saveMissionService.callService(request, (result) => {
      setIsEditing(false);
      setIsViewOnly(true); // Exit edit mode after saving
      onEditModalClose(); // Close the modal after saving
      if (result.success) {
        toast({
          title: "Success",
          description: "Mission updated successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        loadPaths();
      } else {
        toast({
          title: "Error",
          description: "Failed to update mission",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    });
  };

  const handleWaypointsUpdate = (updatedWaypoints) => {
    // Only update waypoints when they are actually modified in the map
    if (!isViewOnly && selectedPath && updatedWaypoints?.length > 0) {
      // Create a copy of the current waypoints
      const currentWaypoints = [...selectedPathWaypoints];
      console.log('Updated waypoints:', updatedWaypoints);
      // console.log('Current waypoints:', currentWaypoints);

      let modifiedWaypoints;

      if (updatedWaypoints.length > currentWaypoints.length) {
        // Addition case
        console.log('Handling waypoint addition');
        // Find the last non-undefined waypoint (the new one)
        const newWaypoint = updatedWaypoints[updatedWaypoints.length - 1];
        if (newWaypoint) {
          modifiedWaypoints = [...currentWaypoints, newWaypoint];
          // console.log('New waypoints array:', modifiedWaypoints);
        }
      } else if (updatedWaypoints.length < currentWaypoints.length) {
          // Deletion case
          console.log('Handling waypoint deletion');
          modifiedWaypoints = updatedWaypoints.filter(wp => wp !== undefined);
      } else if (updatedWaypoints.length === currentWaypoints.length) {
        // Adjustment case
        console.log('Handling waypoint adjustment');
        // Find the non-undefined waypoint in the updated array
        const modifiedIndex = updatedWaypoints.findIndex(wp => wp !== undefined);
        if (modifiedIndex !== -1) {
          modifiedWaypoints = [...currentWaypoints];
          modifiedWaypoints[modifiedIndex] = updatedWaypoints[modifiedIndex];
          // console.log('Modified waypoints array:', modifiedWaypoints);
        }
      }

      // Only update if there are actual changes
      if (modifiedWaypoints) {
        const waypointsChanged = JSON.stringify(modifiedWaypoints) !== JSON.stringify(currentWaypoints);
        if (waypointsChanged) {
          // console.log('Waypoints modified:', modifiedWaypoints);
          setSelectedPathWaypoints(modifiedWaypoints);
        }
      }
    }
  };

  // Add effect to handle waypoint updates
  useEffect(() => {
    if (selectedPathWaypoints.length > 0) {
      console.log('Waypoints state updated:', selectedPathWaypoints);
    }
  }, [selectedPathWaypoints]);

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <Flex direction={{ base: "column", lg: "row" }} gap='20px'>
        {/* Mission List Card */}
        <Card flex={{ base: "1", lg: "0 0 400px" }} maxH={{ base: "400px", lg: "800px" }} overflow="hidden">
          <Flex direction="column" h="100%">
            <Flex justify="space-between" align="center" p={4} borderBottom="1px" borderColor="gray.100">
              <Text fontSize='xl' fontWeight='bold'>
                Saved Missions
              </Text>
            </Flex>
            <Box flex="1" overflowY="auto" p={4}>
              <VStack spacing={4} align="stretch">
                {paths.map((path, index) => (
                  <Flex
                    key={index}
                    justify="space-between"
                    align="center"
                    p={4}
                    bg={selectedPath === path ? "blue.50" : "gray.50"}
                    borderRadius="md"
                    cursor="pointer"
                    onClick={() => handlePathSelect(path)}
                    _hover={{ bg: selectedPath === path ? "blue.100" : "gray.100" }}
                    transition="background-color 0.2s"
                  >
                    <Text>{path}</Text>
                    <Flex gap={2}>
                      <Button
                        colorScheme="green"
                        size="sm"
                        leftIcon={<Icon as={MdPlayArrow} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRunPath(path);
                        }}
                        isDisabled={isLoading || isRunning}
                      >
                        Run
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
                            icon={<Icon as={MdEdit} />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditPath(path);
                            }}
                          >
                            Edit
                          </MenuItem>
                          <MenuItem
                            icon={<Icon as={MdDelete} />}
                            color="red.500"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePath(path);
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
        <MapCard2D
          waypoints={selectedPathWaypoints}
          isViewOnly={isViewOnly}
          isLoading={isLoading}
          key={`${selectedPath}-${isViewOnly}`}
          onWaypointsUpdate={handleWaypointsUpdate}
          flex="1"
          minH={{ base: "400px", lg: "800px" }}
        >
          {!isViewOnly && selectedPath && (
            <Flex position="absolute" bottom="8" right="8" gap={2} zIndex={2}>
              <Button
                colorScheme="red"
                leftIcon={<Icon as={MdClose} />}
                onClick={() => {
                  setIsViewOnly(true);
                  if (selectedPath) {
                    handlePathSelect(selectedPath);
                  }
                }}
                size="md"
              >
                Cancel
              </Button>
              <Button
                colorScheme="blue"
                leftIcon={<Icon as={MdEdit} />}
                onClick={handleSaveChanges}
                isLoading={isEditing}
                loadingText="Saving"
                size="md"
              >
                Save Changes
              </Button>
            </Flex>
          )}
        </MapCard2D>
      </Flex>

      {/* Delete Mission Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={onDeleteModalClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Delete Mission</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>Are you sure you want to delete the mission "{pathToDelete}"?</Text>
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

      {/* Run Mission Modal */}
      <Modal isOpen={isRunModalOpen} onClose={onRunModalClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Run Mission</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>Are you sure you want to execute the mission "{pathToRun}"?</Text>
            <Text mt={2} color="red.500">This will navigate the robot along the selected mission.</Text>
          </ModalBody>

          <ModalFooter>
            <Button
              colorScheme="green"
              mr={3}
              onClick={handleRunConfirm}
              isLoading={isRunning}
              loadingText="Executing"
            >
              Run Mission
            </Button>
            <Button variant="ghost" onClick={onRunModalClose}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit Mission Modal */}
      <Modal isOpen={isEditModalOpen} onClose={onEditModalClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Mission</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>You can now edit the waypoints for "{pathToEdit}".</Text>
            <Text mt={2}>Drag the waypoint markers to new positions and click "Save Changes" when done.</Text>
          </ModalBody>

          <ModalFooter>
            <Button
              colorScheme="blue"
              mr={3}
              onClick={handleEditConfirm}
              isLoading={isEditing}
              loadingText="Saving"
            >
              Save Changes
            </Button>
            <Button variant="ghost" onClick={onEditModalClose}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default ViewMissions; 