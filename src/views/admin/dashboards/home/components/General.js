// Chakra imports
import {
  Flex,
  Icon,
  Text,
  useColorModeValue,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
} from "@chakra-ui/react";
// Custom components
import Card from "components/card/Card.js";
import Controller from "views/admin/dashboards/smartHome/components/Controller";
import React, { useState, useEffect } from "react";
import ROSLIB from 'roslib';
import {ROS_CONFIG} from 'config';
// Assets
import {
  MdPower,
  MdWarning,
  MdBatteryFull,
  MdWaterDrop,
  MdPanTool,
} from "react-icons/md";
import { RiSignalTowerFill } from "react-icons/ri";

export default function General() {
  const [batteryLevel] = useState(75); // This would come from your robot's state
  const [signalStrength] = useState(90); // This would come from your robot's state
  const [isSprayerActive, setIsSprayerActive] = useState(false);
  const [ros, setRos] = useState(null);

  // Initialize ROS connection
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
    });

    newRos.on('close', () => {
      console.log('Connection to ROSbridge closed');
    });

    setRos(newRos);

    return () => {
      if (newRos) {
        newRos.close();
      }
    };
  }, []);

  // Subscribe to sprayer state
  useEffect(() => {
    if (!ros) return;

    const sprayerStateTopic = new ROSLIB.Topic({
      ros: ros,
      name: '/sprayer_state',
      messageType: 'std_msgs/Bool'
    });

    sprayerStateTopic.subscribe((message) => {
      setIsSprayerActive(message.data);
    });

    return () => {
      sprayerStateTopic.unsubscribe();
    };
  }, [ros]);

  // Function to handle sprayer toggle
  const handleSprayerToggle = (newState) => {
    if (!ros) return;

    const sprayerStateTopic = new ROSLIB.Topic({
      ros: ros,
      name: '/sprayer_state',
      messageType: 'std_msgs/Bool'
    });

    const message = new ROSLIB.Message({
      data: newState
    });

    sprayerStateTopic.publish(message);
  };

  // Chakra Color Mode
  const textColor = useColorModeValue("secondaryGray.900", "white");
  const textColorSecondary = useColorModeValue("secondaryGray.600", "white");

  return (
    <Card p='30px' mb='20px'>
      <Flex align='center' mb='20px'>
        <Icon as={MdPower} color='green.500' h='24px' w='24px' me='12px' />
        <Text fontSize='lg' color={textColor} fontWeight='bold'>
          System Status
        </Text>
        <Icon
          as={MdWarning}
          color='orange.500'
          h='20px'
          w='20px'
          ms='auto'
          cursor='pointer'
          title='System Information'
        />
      </Flex>

      {/* Status Grid */}
      <SimpleGrid columns={2} gap='20px' mb='20px'>
        <Stat>
          <StatLabel color={textColorSecondary}>
            <Flex align="center">
              <Icon as={MdBatteryFull} me={2} />
              Battery
            </Flex>
          </StatLabel>
          <StatNumber fontSize="lg">{batteryLevel}%</StatNumber>
          <StatHelpText color={batteryLevel > 20 ? 'green.500' : 'red.500'}>
            {batteryLevel > 20 ? 'Normal' : 'Low Battery'}
          </StatHelpText>
        </Stat>
        <Stat>
          <StatLabel color={textColorSecondary}>
            <Flex align="center">
              <Icon as={RiSignalTowerFill} me={2} />
              Signal
            </Flex>
          </StatLabel>
          <StatNumber fontSize="lg">{signalStrength}%</StatNumber>
          <StatHelpText color={signalStrength > 60 ? 'green.500' : 'orange.500'}>
            {signalStrength > 60 ? 'Strong' : 'Weak Signal'}
          </StatHelpText>
        </Stat>
      </SimpleGrid>

      {/* Controls Grid */}
      <SimpleGrid columns='2' gap='20px'>
        <Controller
          initial={false}
          text='Motor Brake'
          onValue='ENGAGED'
          offValue='RELEASED'
          icon={MdPanTool}
        />
        <Controller
          initial={isSprayerActive}
          text='Sprayer'
          onValue='ACTIVE'
          offValue='INACTIVE'
          icon={MdWaterDrop}
          onChange={handleSprayerToggle}
        />
      </SimpleGrid>
    </Card>
  );
}
