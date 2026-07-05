import React, { useState, useEffect } from 'react';
import {
  Card,
  Text,
  Button,
  Input,
  VStack,
  useToast,
  Box,
  Textarea,
  Badge,
  Flex,
} from "@chakra-ui/react";
import ROSLIB from 'roslib';
import {ROS_CONFIG} from 'config';

const ServiceTestCard = () => {
  const [pathName, setPathName] = useState('');
  const [response, setResponse] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const toast = useToast();

  // ROS connection
  const ros = new ROSLIB.Ros({
    url: ROS_CONFIG.ROSBRIDGE_URL
  });

  useEffect(() => {
    console.log('ServiceTestCard mounted, setting up ROS connection...');
    
    ros.on('connection', () => {
      console.log('Connected to ROSbridge');
      setIsConnected(true);
      toast({
        title: "Connected",
        description: "Successfully connected to ROSbridge",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    });

    ros.on('error', (error) => {
      console.error('Error connecting to ROSbridge:', error);
      setIsConnected(false);
      toast({
        title: "Connection Error",
        description: "Failed to connect to ROSbridge",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    });

    ros.on('close', () => {
      console.log('Connection to ROSbridge closed');
      setIsConnected(false);
      toast({
        title: "Connection Closed",
        description: "Connection to ROSbridge was closed",
        status: "warning",
        duration: 5000,
        isClosable: true,
      });
    });

    return () => {
      ros.close();
    };
  }, []);

  const testGetPath = () => {
    if (!isConnected) {
      toast({
        title: "Not Connected",
        description: "Please wait for ROS connection to be established",
        status: "warning",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    console.log('Testing /get_path service...');
    const getPathService = new ROSLIB.Service({
      ros: ros,
      name: '/get_path',
      serviceType: 'path_execute/GetPath'
    });

    // Create request using ServiceRequest
    const request = new ROSLIB.ServiceRequest({
      path_name: pathName
    });

    getPathService.callService(request, (result) => {
      console.log('Get path response:', result);
      setResponse(JSON.stringify(result, null, 2));
      if (!result.success) {
        toast({
          title: "Error",
          description: result.message || "Failed to get path",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    }, (error) => {
      console.error('Error calling /get_path:', error);
      setResponse(`Error: ${error.message}`);
      toast({
        title: "Service Call Error",
        description: `Error calling /get_path service: ${error.message}`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    });
  };

  const testListPaths = () => {
    if (!isConnected) {
      toast({
        title: "Not Connected",
        description: "Please wait for ROS connection to be established",
        status: "warning",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    console.log('Testing /list_paths service...');
    const listPathsService = new ROSLIB.Service({
      ros: ros,
      name: '/list_paths',
      serviceType: 'path_execute/ListPaths'
    });

    // Create request using ServiceRequest
    const request = new ROSLIB.ServiceRequest({
      filter: ''
    });

    listPathsService.callService(request, (result) => {
      console.log('List paths response:', result);
      setResponse(JSON.stringify(result, null, 2));
      if (!result.success) {
        toast({
          title: "Error",
          description: result.message || "Failed to list paths",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    }, (error) => {
      console.error('Error calling /list_paths:', error);
      setResponse(`Error: ${error.message}`);
      toast({
        title: "Service Call Error",
        description: `Error calling /list_paths service: ${error.message}`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    });
  };

  const testDeletePath = () => {
    if (!isConnected) {
      toast({
        title: "Not Connected",
        description: "Please wait for ROS connection to be established",
        status: "warning",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    console.log('Testing /delete_path service...');
    const deletePathService = new ROSLIB.Service({
      ros: ros,
      name: '/delete_path',
      serviceType: 'path_execute/DeletePath'
    });

    // Create request using ServiceRequest
    const request = new ROSLIB.ServiceRequest({
      path_name: pathName
    });

    deletePathService.callService(request, (result) => {
      console.log('Delete path response:', result);
      setResponse(JSON.stringify(result, null, 2));
      if (result.success) {
        toast({
          title: "Success",
          description: "Path deleted successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to delete path",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    }, (error) => {
      console.error('Error calling /delete_path:', error);
      setResponse(`Error: ${error.message}`);
      toast({
        title: "Service Call Error",
        description: `Error calling /delete_path service: ${error.message}`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    });
  };

  const testSavePath = () => {
    if (!isConnected) {
      toast({
        title: "Not Connected",
        description: "Please wait for ROS connection to be established",
        status: "warning",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    console.log('Testing /save_path service...');
    const savePathService = new ROSLIB.Service({
      ros: ros,
      name: '/save_path',
      serviceType: 'path_execute/SavePath'
    });

    // Create a simple waypoint at (0,0)
    const waypoint = new ROSLIB.Message({
      position: new ROSLIB.Message({
        x: 0.0,
        y: 0.0,
        z: 0.0
      }),
      orientation: new ROSLIB.Message({
        x: 0.0,
        y: 0.0,
        z: 0.0,
        w: 1.0
      })
    });

    // Create request using ServiceRequest
    const request = new ROSLIB.ServiceRequest({
      path_name: pathName || 'test_path',
      waypoints: [waypoint]
    });

    savePathService.callService(request, (result) => {
      console.log('Save path response:', result);
      setResponse(JSON.stringify(result, null, 2));
      if (result.success) {
        toast({
          title: "Success",
          description: "Path saved successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
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
      console.error('Error calling /save_path:', error);
      setResponse(`Error: ${error.message}`);
      toast({
        title: "Service Call Error",
        description: `Error calling /save_path service: ${error.message}`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    });
  };

  const testRunPath = () => {
    if (!isConnected) {
      toast({
        title: "Not Connected",
        description: "Please wait for ROS connection to be established",
        status: "warning",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    console.log('Testing /run_path service...');
    const runPathService = new ROSLIB.Service({
      ros: ros,
      name: '/run_path',
      serviceType: 'path_execute/RunPath'
    });

    // Create request using ServiceRequest
    const request = new ROSLIB.ServiceRequest({
      path_name: pathName
    });

    runPathService.callService(request, (result) => {
      console.log('Run path response:', result);
      setResponse(JSON.stringify(result, null, 2));
      if (result.success) {
        toast({
          title: "Success",
          description: result.message || "Path execution started",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to start path execution",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    }, (error) => {
      console.error('Error calling /run_path:', error);
      setResponse(`Error: ${error.message}`);
      toast({
        title: "Service Call Error",
        description: `Error calling /run_path service: ${error.message}`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    });
  };

  return (
    <Card p='20px' mb='20px'>
      <Flex justify="space-between" align="center" mb='20px'>
        <Text fontSize='xl' fontWeight='bold'>Service Test Panel</Text>
        <Badge colorScheme={isConnected ? "green" : "red"}>
          {isConnected ? "Connected" : "Disconnected"}
        </Badge>
      </Flex>
      <VStack spacing={4} align="stretch">
        <Input
          placeholder="Enter path name"
          value={pathName}
          onChange={(e) => setPathName(e.target.value)}
        />
        <Box>
          <Button 
            colorScheme="blue" 
            mr={2} 
            onClick={testGetPath}
            isDisabled={!isConnected}
          >
            Test Get Path
          </Button>
          <Button 
            colorScheme="green" 
            mr={2} 
            onClick={testListPaths}
            isDisabled={!isConnected}
          >
            Test List Paths
          </Button>
          <Button 
            colorScheme="yellow"
            mr={2}
            onClick={testSavePath}
            isDisabled={!isConnected}
          >
            Test Save Path
          </Button>
          <Button 
            colorScheme="purple"
            mr={2}
            onClick={testRunPath}
            isDisabled={!isConnected}
          >
            Test Run Path
          </Button>
          <Button 
            colorScheme="red" 
            onClick={testDeletePath}
            isDisabled={!isConnected}
          >
            Test Delete Path
          </Button>
        </Box>
        <Textarea
          value={response}
          readOnly
          placeholder="Service response will appear here..."
          height="200px"
          bg="gray.50"
        />
      </VStack>
    </Card>
  );
};

export default ServiceTestCard; 