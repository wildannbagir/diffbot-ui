import React, { useState } from 'react';
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
} from "@chakra-ui/react";
import Card from "components/card/Card.js";
import MapCard2D from "views/admin/dashboards/maps/components/MapCard2D";
import { MdPlayArrow, MdSave, MdCancel } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import ROSLIB from 'roslib';
import {ROS_CONFIG} from 'config';

const CreateMap = () => {
  const [isMapping, setIsMapping] = useState(false);
  const [mapName, setMapName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const textColorSecondary = useColorModeValue("secondaryGray.700", "white");
  const navigate = useNavigate();
  const toast = useToast();

  // ROS connection
  const ros = new ROSLIB.Ros({
    url: ROS_CONFIG.ROSBRIDGE_URL
  });

  // ROS service clients
  const startMappingService = new ROSLIB.Service({
    ros: ros,
    name: '/start_mapping',
    serviceType: 'std_srvs/Trigger'
  });

  const finishMappingService = new ROSLIB.Service({
    ros: ros,
    name: '/finish_mapping',
    serviceType: 'ugv/SaveMap'
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
    navigate('/admin/maps/view');
  };

  const handleStartMapping = () => {
    setIsMapping(true);
    startMappingService.callService({}, (result) => {
      if (result.success) {
        toast({
          title: "Success",
          description: "Mapping started successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to start mapping",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        setIsMapping(false);
      }
    }, (error) => {
      console.error('Error calling start_mapping service:', error);
      toast({
        title: "Error",
        description: "Failed to start mapping",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      setIsMapping(false);
    });
  };

  const handleSaveMap = () => {
    onOpen(); // Open the save modal
  };

  const handleSaveConfirm = async () => {
    if (!mapName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a map name",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsSaving(true);
    try {
      finishMappingService.callService({ map_name: mapName.trim() }, (result) => {
        if (result.success) {
          setIsSaving(false);
          onClose();
          toast({
            title: "Success",
            description: "Map saved successfully",
            status: "success",
            duration: 3000,
            isClosable: true,
          });
          navigate('/admin/home');
        } else {
          setIsSaving(false);
          toast({
            title: "Error",
            description: result.message || "Failed to save map",
            status: "error",
            duration: 5000,
            isClosable: true,
          });
        }
      }, (error) => {
        console.error('Error calling finish_mapping service:', error);
        setIsSaving(false);
        toast({
          title: "Error",
          description: "Failed to save map",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      });
    } catch (error) {
      setIsSaving(false);
      toast({
        title: "Error",
        description: "Failed to save map",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      console.error('Save map error:', error);
    }
  };

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <SimpleGrid columns={{ base: 1, md: 1, xl: 1 }} gap='20px' mb='20px'>
        {/* Map Creation Controls */}
        <Card>
          <Flex direction={{ base: "column", md: "row" }} justify="space-between" align="center" w="100%" px='15px' py='10px'>
            <Flex direction="row" align="center" gap={4}>
              {!isMapping ? (
                <Button
                  variant="brand"
                  leftIcon={<Icon as={MdPlayArrow} />}
                  onClick={handleStartMapping}
                >
                  Start Mapping
                </Button>
              ) : (
                <Button
                  variant="brand"
                  leftIcon={<Icon as={MdSave} />}
                  onClick={handleSaveMap}
                >
                  Save Map
                </Button>
              )}
              <Button
                variant="outline"
                colorScheme="red"
                leftIcon={<Icon as={MdCancel} />}
                onClick={handleCancel}
              >
                Cancel
              </Button>
            </Flex>
          </Flex>
        </Card>

        {/* 2D Map */}
        <MapCard2D />
      </SimpleGrid>

      {/* Save Map Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Save Map</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl>
              <FormLabel>Map Name</FormLabel>
              <Input
                placeholder="Enter map name"
                value={mapName}
                onChange={(e) => setMapName(e.target.value)}
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

export default CreateMap; 