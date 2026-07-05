/*!
  _   _  ___  ____  ___ ________  _   _   _   _ ___   ____  ____   ___  
 | | | |/ _ \|  _ \|_ _|__  / _ \| \ | | | | | |_ _| |  _ \|  _ \ / _ \ 
 | |_| | | | | |_) || |  / / | | |  \| | | | | || |  | |_) | |_) | | | |
 |  _  | |_| |  _ < | | / /| |_| | |\  | | |_| || |  |  __/|  _ <| |_| |
 |_| |_|\___/|_| \_\___/____\___/|_| \_|  \___/|___| |_|   |_| \_\\___/ 
                                                                                                                                                                                                                                                                                                                                       
=========================================================
* Horizon UI Dashboard PRO - v1.0.0
=========================================================

* Product Page: https://www.horizon-ui.com/pro/
* Copyright 2022 Horizon UI (https://www.horizon-ui.com/)

* Designed and Coded by Simmmple

=========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

*/

// Chakra imports
import {
  Box,
  Grid,
  Icon,
  Flex,
  Text,
  SimpleGrid,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  useColorModeValue,
} from "@chakra-ui/react";
// Custom components
import Card from "components/card/Card.js";
import React from "react";
import { FaChild, FaFan } from "react-icons/fa";
import { ButtonLeft, ButtonRight } from "components/icons/Icons";
// Assets
import {
  MdLibraryMusic,
  MdLiveTv,
  MdLock,
  MdOutlineWbSunny,
  MdPhoneInTalk,
  MdChevronLeft,
  MdChevronRight,
} from "react-icons/md";
import EagleView from "views/admin/dashboards/home/components/EagleView";
import MapCard3D from "views/admin/dashboards/home/components/MapCard3D";
import Phone from "views/admin/dashboards/home/components/Phone";
import Teleop from "views/admin/dashboards/home/components/Teleop";
import General from "views/admin/dashboards/home/components/General";

const MainDashboard = () => {
  // Chakra Color Mode
  const textColorSecondary = useColorModeValue("secondaryGray.700", "white");
  const brandBg = useColorModeValue("white", "navy.800");

  return (
    <Grid
      pt={{ base: "130px", md: "80px", xl: "80px" }}
      gridTemplateColumns={{
        base: "repeat(2, 1fr)",
        "2xl": "1fr 1.13fr 1.45fr",
      }}
      gridTemplateRows={{
        base: "repeat(2, 1fr)",
        "2xl": "1fr",
      }}
      gap={{ base: "20px", xl: "20px" }}
      display={{ base: "block", lg: "grid" }}>
      <MapCard3D gridArea='1 / 1 / 1 / 4'/>
      <Box gridArea='1 / 4 / 1 / 6'> 
        <General />
        <Teleop />
        {/* <Card flexDirection='row' p='50px' mt='20px' mb={{ base: "20px", lg: "0px" }}>
          <Icon
            h='30px'
            w='30px'
            me='20px'
            as={MdOutlineWbSunny}
            color={textColorSecondary}
          />
          <Slider defaultValue={10} zIndex='0'>
            <SliderTrack h='4px' borderRadius='78px'>
              <SliderFilledTrack bg={textColorSecondary} />
            </SliderTrack>
            <SliderThumb
              boxShadow='0px 3px 27px -20px rgba(112, 144, 176, 0.51)'
              w='18px'
              h='18px'
              border='4px solid'
              borderColor={textColorSecondary}
              bg={brandBg}
              index={0}
            />
          </Slider>
        </Card> */}
      </Box>
    </Grid>
  );
};

export default MainDashboard;
