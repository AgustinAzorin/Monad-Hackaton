import { createConfig, http } from 'wagmi';
import { monadTestnet } from 'viem/chains';

export const wagmiConfig = createConfig({
  chains: [monadTestnet],
  transports: {
    [monadTestnet.id]: http(),
  },
});
