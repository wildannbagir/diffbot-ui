// Chakra imports
import { Flex, Icon, Text, useColorModeValue } from "@chakra-ui/react";
// Custom components
import IconBox from "components/icons/IconBox";
import React, { useState, useEffect } from "react";

export default function CircularProgress(props) {
  const { icon, text, onValue, offValue, initial, onChange } = props;
  const [activated, setActivated] = useState(initial);

  // Update activated state when initial prop changes
  useEffect(() => {
    setActivated(initial);
  }, [initial]);

  // Chakra Color Mode
  const completeBg = useColorModeValue(
    "white",
    "linear-gradient(180deg, #1F2A4F 0%, #18224D 50.63%, #111C44 100%)"
  );
  const completeIcon = useColorModeValue("brand.500", "white");
  const completeShadow = useColorModeValue(
    "0px 18px 40px rgba(112, 144, 176, 0.12)",
    "inset 0px 4px 4px rgba(255, 255, 255, 0.2)"
  );
  const completeColor = useColorModeValue("brand.500", "white");
  const incompleteBg = useColorModeValue(
    "white",
    "linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.03) 50.63%, rgba(255, 255, 255, 0) 100%)"
  );
  const incompleteIcon = useColorModeValue(
    "secondaryGray.600",
    "whiteAlpha.200"
  );
  const incompleteColor = useColorModeValue("secondaryGray.700", "white");
  const incompleteShadow = useColorModeValue(
    "inset 0px 18px 22px rgba(112, 144, 176, 0.1)",
    "inset 0px 4px 4px #0B1437"
  );

  const handleClick = () => {
    const newState = !activated;
    setActivated(newState);
    if (onChange) {
      onChange(newState);
    }
  };

  return (
    <Flex
      direction='column'
      justify='center'
      align='center'
      cursor='pointer'
      onClick={handleClick}>
      <IconBox
        transition='0.2s linear'
        mb='10px'
        h='66px'
        w='66px'
        bg={activated ? completeBg : incompleteBg}
        boxShadow={activated ? completeShadow : incompleteShadow}
        icon={
          <Icon
            transition='0.2s linear'
            as={icon}
            color={activated ? completeIcon : incompleteIcon}
            h='32px'
            w='32px'
          />
        }
      />
      <Text
        transition='0.2s linear'
        fontSize='sm'
        fontWeight='500'
        color='secondaryGray.600'
        me='4px'>
        {text}:{" "}
        <Text
          as='span'
          transition='0.2s linear'
          fontSize='sm'
          fontWeight='700'
          color={activated ? completeColor : incompleteColor}>
          {activated ? onValue : offValue}
        </Text>
      </Text>
    </Flex>
  );
}
