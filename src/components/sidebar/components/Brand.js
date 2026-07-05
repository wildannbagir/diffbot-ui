// Chakra imports
import { Flex, Image } from '@chakra-ui/react';

// Custom components
import logoWarna from 'assets/img/logo-warna.png';
import { HSeparator } from 'components/separator/Separator';

export function SidebarBrand(props) {
  const { toggleSidebar } = props;

  return (
    <Flex alignItems="center" flexDirection="column">
      <Flex onClick={toggleSidebar} cursor="pointer" justifyContent="center" alignItems="center">
        <Image
          src={logoWarna}
          alt="SDG Guthrie Logo"
          h="50px"
          w="auto"
          my="15px"
          objectFit="contain"
        />
      </Flex>
      <HSeparator mb="20px" />
    </Flex>
  );
}

export default SidebarBrand;
