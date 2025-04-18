export type ExampleCctpWithExecutor = {
  version: "0.1.0";
  name: "example_cctp_with_executor";
  instructions: [
    {
      name: "relayLastMessage";
      accounts: [
        {
          name: "payer";
          isMut: true;
          isSigner: true;
        },
        {
          name: "payee";
          isMut: true;
          isSigner: false;
        },
        {
          name: "messageTransmitter";
          isMut: false;
          isSigner: false;
        },
        {
          name: "executorProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "args";
          type: {
            defined: "relayLastMessageArgs";
          };
        }
      ];
    }
  ];
  types: [
    {
      name: "relayLastMessageArgs";
      type: {
        kind: "struct";
        fields: [
          {
            name: "recipientChain";
            type: "u16";
          },
          {
            name: "execAmount";
            type: "u64";
          },
          {
            name: "signedQuoteBytes";
            type: "bytes";
          },
          {
            name: "relayInstructions";
            type: "bytes";
          }
        ];
      };
    }
  ];
};

export const ExampleCctpWithExecutorIdl: ExampleCctpWithExecutor = {
  version: "0.1.0",
  name: "example_cctp_with_executor",
  instructions: [
    {
      name: "relayLastMessage",
      accounts: [
        {
          name: "payer",
          isMut: true,
          isSigner: true,
        },
        {
          name: "payee",
          isMut: true,
          isSigner: false,
        },
        {
          name: "messageTransmitter",
          isMut: false,
          isSigner: false,
        },
        {
          name: "executorProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "args",
          type: {
            defined: "relayLastMessageArgs",
          },
        },
      ],
    },
  ],
  types: [
    {
      name: "relayLastMessageArgs",
      type: {
        kind: "struct",
        fields: [
          {
            name: "recipientChain",
            type: "u16",
          },
          {
            name: "execAmount",
            type: "u64",
          },
          {
            name: "signedQuoteBytes",
            type: "bytes",
          },
          {
            name: "relayInstructions",
            type: "bytes",
          },
        ],
      },
    },
  ],
};
