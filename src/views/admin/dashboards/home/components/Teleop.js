import React, { useState } from 'react';
// Chakra imports
import {
  Box,
  Flex,
  Icon,
  Text,
  Switch,
  useColorModeValue,
  Tooltip,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
} from '@chakra-ui/react';
// Custom components
import { RosConnection, Publisher } from "rosreact";
import {ROS_CONFIG} from 'config';
import { Joystick } from 'react-joystick-component';
import Card from 'components/card/Card.js';
// Assets
import { MdLock, MdSpeed, MdGamepad } from 'react-icons/md';
import { IoSpeedometerOutline } from 'react-icons/io5';

export default function Teleop(props) {
  const { ...rest } = props;
  const [linearVelocity, setLinearVelocity] = useState(0);
  const [angularVelocity, setAngularVelocity] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const brandBg = useColorModeValue("white", "navy.800");
  const textColor = useColorModeValue("secondaryGray.900", "white");
  const textColorSecondary = useColorModeValue('secondaryGray.600', 'white');

  // Max velocities for scaling joystick output
  const MAX_LINEAR_VELOCITY = 0.5;  // m/s
  const MAX_ANGULAR_VELOCITY = 1.0;  // rad/s

  // Create the Twist message for cmd_vel
  const cmdVelMessage = {
    linear: {
      x: isLocked ? 0 : linearVelocity,
      y: 0,
      z: 0
    },
    angular: {
      x: 0,
      y: 0,
      z: isLocked ? 0 : angularVelocity
    }
  };

  const handleMove = (event) => {
    if (!isLocked) {
      // Convert joystick position to velocities
      // x position maps to angular velocity (rotation)
      // y position maps to linear velocity (forward/backward)
      
      // Scale x and y directly without dividing by 100 since joystick already gives normalized values
      const linear = event.y * MAX_LINEAR_VELOCITY;
      const angular = -event.x * MAX_ANGULAR_VELOCITY;

      setLinearVelocity(linear);
      setAngularVelocity(angular);
    }
  };

  const handleStop = () => {
    setLinearVelocity(0);
    setAngularVelocity(0);
  };

  return (
    <Card align="center" direction="column" w="100%" {...rest}>
      <RosConnection url={ROS_CONFIG.ROSBRIDGE_URL} autoConnect>
        <Publisher
          topic="/cmd_vel"
          messageType="geometry_msgs/Twist"
          message={cmdVelMessage}
          throttleRate={100}
        />
      </RosConnection>

      {/* Header with Lock Control */}
      <Flex align='center' w="100%" px="15px" py="10px" mb={2}>
        <Icon as={MdGamepad} color='blue.500' h='24px' w='24px' me='12px' />
        <Text fontSize='lg' color={textColor} fontWeight='bold'>
          Robot Control
        </Text>
        <Tooltip label={isLocked ? "Unlock Controls" : "Lock Controls"} placement="top">
          <Flex ms="auto" align="center">
            <Switch
              colorScheme="brand"
              isChecked={isLocked}
              onChange={() => setIsLocked(!isLocked)}
              me={2}
            />
            <Icon
              as={MdLock}
              color={isLocked ? "red.500" : textColorSecondary}
              w="20px"
              h="20px"
            />
          </Flex>
        </Tooltip>
      </Flex>

      {/* Velocity Stats */}
      <SimpleGrid columns={2} spacing={4} w="100%" px="15px" mb={4}>
        <Stat>
          <StatLabel color={textColorSecondary}>
            <Flex align="center">
              <Icon as={MdSpeed} me={1} />
              Linear Velocity
            </Flex>
          </StatLabel>
          <StatNumber fontSize="lg">{linearVelocity.toFixed(2)} m/s</StatNumber>
          <StatHelpText>Max: {MAX_LINEAR_VELOCITY} m/s</StatHelpText>
        </Stat>
        <Stat>
          <StatLabel color={textColorSecondary}>
            <Flex align="center">
              <Icon as={IoSpeedometerOutline} me={1} />
              Angular Velocity
            </Flex>
          </StatLabel>
          <StatNumber fontSize="lg">{angularVelocity.toFixed(2)} rad/s</StatNumber>
          <StatHelpText>Max: {MAX_ANGULAR_VELOCITY} rad/s</StatHelpText>
        </Stat>
      </SimpleGrid>

      {/* Joystick Control */}
      <Flex h="200px" align="center" justify="center" w="100%">
        <Box
          position="relative"
          bgColor={useColorModeValue('gray.100', 'navy.700')}
          borderRadius="full"
          p={4}
          opacity={isLocked ? 0.5 : 1}
        >
          <Joystick 
            size={120} 
            sticky={false} 
            baseColor={useColorModeValue('#E2E8F0', '#2D3748')}
            stickColor={useColorModeValue('#CBD5E0', '#4A5568')}
            move={handleMove} 
            stop={handleStop}
            disabled={isLocked}
          />
        </Box>
      </Flex>
    </Card>
  );
}
