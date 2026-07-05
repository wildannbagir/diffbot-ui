import React, { useState } from 'react';
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
} from "@chakra-ui/react";
import Card from "components/card/Card.js";
import MapCard2D from "views/admin/dashboards/paths/components/MapCard2D";
import { MdSave, MdCancel } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import ROSLIB from 'roslib';
import {ROS_CONFIG} from 'config';

const CreatePath = () => {
  const [waypoints, setWaypoints] = useState([]);
  const [pathName, setPathName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const textColorSecondary = useColorModeValue("secondaryGray.700", "white");
  const navigate = useNavigate();
  const toast = useToast();

  // ROS connection
  const ros = new ROSLIB.Ros({
    url: ROS_CONFIG.ROSBRIDGE_URL
  });

  ros.on('connection', () => {
    console.log('Connected to ROSBridge');
  });

  ros.on('error', (error) => {
    console.error('ROSBridge error:', error);
  });

  ros.on('close', () => {
    console.log('ROSBridge connection closed');
  });

  const handleCancel = () => {
    navigate('/admin/home');
  };

  const handleSaveConfirm = async () => {
    if (!pathName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a path name",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsSaving(true);
    try {
      const savePathService = new ROSLIB.Service({
        ros: ros,
        name: '/save_path',
        serviceType: 'path_execute/SavePath'
      });

      // Filter out undefined waypoints and format remaining ones
      const validWaypoints = waypoints.filter(wp => wp !== undefined);
      
      // Check if we have any valid waypoints
      if (validWaypoints.length === 0) {
        toast({
          title: "Error",
          description: "No valid waypoints to save",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        setIsSaving(false);
        return;
      }

      const formattedWaypoints = validWaypoints.map(wp => {
        // Convert orientation angle to quaternion
        const angle = wp.orientation;
        const quaternion = {
          x: 0.0,
          y: 0.0,
          z: Math.sin(angle / 2),
          w: Math.cos(angle / 2)
        };

        return {
          position: new ROSLIB.Message({
            x: wp.position.x,
            y: wp.position.y,
            z: 0.0
          }),
          orientation: new ROSLIB.Message(quaternion)
        };
      });

      const request = new ROSLIB.ServiceRequest({
        path_name: pathName,
        waypoints: formattedWaypoints
      });

      savePathService.callService(request, (result) => {
        setIsSaving(false);
        if (result.success) {
          toast({
            title: "Success",
            description: "Path saved successfully",
            status: "success",
            duration: 3000,
            isClosable: true,
          });
          onClose();
          navigate('/admin/home');
        } else {
          toast({
            title: "Error",
            description: result.message || "Failed to save path",
            status: "error",
            duration: 5000,
            isClosable: true,
          });
        }
      }, (error) => {
        setIsSaving(false);
        toast({
          title: "Error",
          description: "Failed to call save service",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        console.error('Service call failed:', error);
      });
    } catch (error) {
      setIsSaving(false);
      toast({
        title: "Error",
        description: "Failed to save path",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      console.error('Save path error:', error);
    }
  };

  const handleWaypointsUpdate = (updatedWaypoints) => {
    setWaypoints(updatedWaypoints);
  };

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <SimpleGrid columns={{ base: 1, md: 1, xl: 1 }} gap='20px' mb='20px'>
        {/* Path Creation Controls */}
        <Card>
          <Flex direction={{ base: "column", md: "row" }} justify="space-between" align="center" w="100%" px='15px' py='10px'>
            <Flex direction="row" align="center" gap={4}>
              <Button
                variant="brand"
                leftIcon={<Icon as={MdSave} />}
                onClick={onOpen}
                isDisabled={waypoints.length === 0}
              >
                Save Path
              </Button>
              <Button
                variant="outline"
                colorScheme="red"
                leftIcon={<Icon as={MdCancel} />}
                onClick={handleCancel}
              >
                Cancel
              </Button>
            </Flex>
            <Stat textAlign={{ base: "center", md: "right" }}>
              <StatLabel color={textColorSecondary}>Waypoints</StatLabel>
              <StatNumber>{waypoints.length}</StatNumber>
            </Stat>
          </Flex>
        </Card>

        {/* 2D Map */}
        <MapCard2D onWaypointsUpdate={handleWaypointsUpdate} />
      </SimpleGrid>

      {/* Save Path Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Save Path</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl>
              <FormLabel>Path Name</FormLabel>
              <Input
                placeholder="Enter path name"
                value={pathName}
                onChange={(e) => setPathName(e.target.value)}
              />
            </FormControl>
          </ModalBody>

          <ModalFooter>
            <Button
              colorScheme="blue"
              mr={3}
              onClick={handleSaveConfirm}
              isLoading={isSaving}
              loadingText="Saving"
            >
              Save
            </Button>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default CreatePath; 