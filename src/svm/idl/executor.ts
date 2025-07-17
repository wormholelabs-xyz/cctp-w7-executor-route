export type Executor = {
  version: "0.1.0";
  name: "executor";
  instructions: [
    {
      name: "requestForExecution";
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
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "args";
          type: {
            defined: "RequestForExecutionArgs";
          };
        }
      ];
    }
  ];
  types: [
    {
      name: "RequestForExecutionArgs";
      type: {
        kind: "struct";
        fields: [
          {
            name: "amount";
            type: "u64";
          },
          {
            name: "dstChain";
            type: "u16";
          },
          {
            name: "dstAddr";
            type: {
              array: ["u8", 32];
            };
          },
          {
            name: "refundAddr";
            type: "publicKey";
          },
          {
            name: "signedQuoteBytes";
            type: "bytes";
          },
          {
            name: "requestBytes";
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
  errors: [
    {
      code: 6000;
      name: "InvalidArguments";
      msg: "InvalidArguments";
    },
    {
      code: 6001;
      name: "QuoteSrcChainMismatch";
      msg: "QuoteSrcChainMismatch";
    },
    {
      code: 6002;
      name: "QuoteDstChainMismatch";
      msg: "QuoteDstChainMismatch";
    },
    {
      code: 6003;
      name: "QuoteExpired";
      msg: "QuoteExpired";
    },
    {
      code: 6004;
      name: "QuotePayeeMismatch";
      msg: "QuotePayeeMismatch";
    }
  ];
};

export const ExecutorIdl: Executor = {
  version: "0.1.0",
  name: "executor",
  instructions: [
    {
      name: "requestForExecution",
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
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "args",
          type: {
            defined: "RequestForExecutionArgs",
          },
        },
      ],
    },
  ],
  types: [
    {
      name: "RequestForExecutionArgs",
      type: {
        kind: "struct",
        fields: [
          {
            name: "amount",
            type: "u64",
          },
          {
            name: "dstChain",
            type: "u16",
          },
          {
            name: "dstAddr",
            type: {
              array: ["u8", 32],
            },
          },
          {
            name: "refundAddr",
            type: "publicKey",
          },
          {
            name: "signedQuoteBytes",
            type: "bytes",
          },
          {
            name: "requestBytes",
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
  errors: [
    {
      code: 6000,
      name: "InvalidArguments",
      msg: "InvalidArguments",
    },
    {
      code: 6001,
      name: "QuoteSrcChainMismatch",
      msg: "QuoteSrcChainMismatch",
    },
    {
      code: 6002,
      name: "QuoteDstChainMismatch",
      msg: "QuoteDstChainMismatch",
    },
    {
      code: 6003,
      name: "QuoteExpired",
      msg: "QuoteExpired",
    },
    {
      code: 6004,
      name: "QuotePayeeMismatch",
      msg: "QuotePayeeMismatch",
    },
  ],
};
