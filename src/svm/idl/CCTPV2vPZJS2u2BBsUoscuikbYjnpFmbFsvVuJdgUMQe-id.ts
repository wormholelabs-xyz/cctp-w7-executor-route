// Type definitions based on the IDL
export type TokenMessengerMinterV2 = {
  version: "0.2.0";
  name: "token_messenger_minter_v2";
  instructions: [
    {
      name: "acceptOwnership";
      accounts: [
        {
          name: "pendingOwner";
          isMut: false;
          isSigner: true;
        },
        {
          name: "tokenMessenger";
          isMut: true;
          isSigner: false;
        },
        {
          name: "eventAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "program";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "params";
          type: {
            defined: "AcceptOwnershipParams";
          };
        }
      ];
    },
    {
      name: "addLocalToken";
      accounts: [
        {
          name: "payer";
          isMut: true;
          isSigner: true;
        },
        {
          name: "tokenController";
          isMut: false;
          isSigner: true;
        },
        {
          name: "tokenMinter";
          isMut: false;
          isSigner: false;
        },
        {
          name: "localToken";
          isMut: true;
          isSigner: false;
        },
        {
          name: "custodyTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "localTokenMint";
          isMut: false;
          isSigner: false;
        },
        {
          name: "tokenProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "eventAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "program";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "params";
          type: {
            defined: "AddLocalTokenParams";
          };
        }
      ];
    },
    {
      name: "addRemoteTokenMessenger";
      accounts: [
        {
          name: "payer";
          isMut: true;
          isSigner: true;
        },
        {
          name: "owner";
          isMut: false;
          isSigner: true;
        },
        {
          name: "tokenMessenger";
          isMut: false;
          isSigner: false;
        },
        {
          name: "remoteTokenMessenger";
          isMut: true;
          isSigner: false;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "eventAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "program";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "params";
          type: {
            defined: "AddRemoteTokenMessengerParams";
          };
        }
      ];
    },
    {
      name: "burnTokenCustody";
      accounts: [
        {
          name: "payee";
          isMut: true;
          isSigner: true;
        },
        {
          name: "tokenController";
          isMut: false;
          isSigner: true;
        },
        {
          name: "tokenMinter";
          isMut: false;
          isSigner: false;
        },
        {
          name: "localToken";
          isMut: false;
          isSigner: false;
        },
        {
          name: "custodyTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "custodyTokenMint";
          isMut: true;
          isSigner: false;
        },
        {
          name: "tokenProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "eventAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "program";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "params";
          type: {
            defined: "BurnTokenCustodyParams";
          };
        }
      ];
    },
    {
      name: "denylistAccount";
      accounts: [
        {
          name: "payer";
          isMut: true;
          isSigner: true;
        },
        {
          name: "denylister";
          isMut: false;
          isSigner: true;
        },
        {
          name: "tokenMessenger";
          isMut: false;
          isSigner: false;
        },
        {
          name: "denylistAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "eventAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "program";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "params";
          type: {
            defined: "DenylistParams";
          };
        }
      ];
    },
    {
      name: "depositForBurn";
      accounts: [
        {
          name: "owner";
          isMut: false;
          isSigner: true;
        },
        {
          name: "eventRentPayer";
          isMut: true;
          isSigner: true;
        },
        {
          name: "senderAuthorityPda";
          isMut: false;
          isSigner: false;
        },
        {
          name: "burnTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "denylistAccount";
          isMut: false;
          isSigner: false;
        },
        {
          name: "messageTransmitter";
          isMut: true;
          isSigner: false;
        },
        {
          name: "tokenMessenger";
          isMut: false;
          isSigner: false;
        },
        {
          name: "remoteTokenMessenger";
          isMut: false;
          isSigner: false;
        },
        {
          name: "tokenMinter";
          isMut: false;
          isSigner: false;
        },
        {
          name: "localToken";
          isMut: true;
          isSigner: false;
        },
        {
          name: "burnTokenMint";
          isMut: true;
          isSigner: false;
        },
        {
          name: "messageSentEventData";
          isMut: true;
          isSigner: true;
        },
        {
          name: "messageTransmitterProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "tokenMessengerMinterProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "tokenProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "eventAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "program";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "params";
          type: {
            defined: "DepositForBurnParams";
          };
        }
      ];
    },
    {
      name: "depositForBurnWithHook";
      accounts: [
        {
          name: "owner";
          isMut: false;
          isSigner: true;
        },
        {
          name: "eventRentPayer";
          isMut: true;
          isSigner: true;
        },
        {
          name: "senderAuthorityPda";
          isMut: false;
          isSigner: false;
        },
        {
          name: "burnTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "denylistAccount";
          isMut: false;
          isSigner: false;
        },
        {
          name: "messageTransmitter";
          isMut: true;
          isSigner: false;
        },
        {
          name: "tokenMessenger";
          isMut: false;
          isSigner: false;
        },
        {
          name: "remoteTokenMessenger";
          isMut: false;
          isSigner: false;
        },
        {
          name: "tokenMinter";
          isMut: false;
          isSigner: false;
        },
        {
          name: "localToken";
          isMut: true;
          isSigner: false;
        },
        {
          name: "burnTokenMint";
          isMut: true;
          isSigner: false;
        },
        {
          name: "messageSentEventData";
          isMut: true;
          isSigner: true;
        },
        {
          name: "messageTransmitterProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "tokenMessengerMinterProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "tokenProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "eventAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "program";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "params";
          type: {
            defined: "DepositForBurnWithHookParams";
          };
        }
      ];
    },
    {
      name: "handleReceiveFinalizedMessage";
      accounts: [
        {
          name: "authorityPda";
          isMut: false;
          isSigner: true;
        },
        {
          name: "tokenMessenger";
          isMut: false;
          isSigner: false;
        },
        {
          name: "remoteTokenMessenger";
          isMut: false;
          isSigner: false;
        },
        {
          name: "tokenMinter";
          isMut: false;
          isSigner: false;
        },
        {
          name: "localToken";
          isMut: true;
          isSigner: false;
        },
        {
          name: "tokenPair";
          isMut: false;
          isSigner: false;
        },
        {
          name: "feeRecipientTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "recipientTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "custodyTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "tokenProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "eventAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "program";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "params";
          type: {
            defined: "HandleReceiveMessageParams";
          };
        }
      ];
    },
    {
      name: "handleReceiveUnfinalizedMessage";
      accounts: [
        {
          name: "authorityPda";
          isMut: false;
          isSigner: true;
        },
        {
          name: "tokenMessenger";
          isMut: false;
          isSigner: false;
        },
        {
          name: "remoteTokenMessenger";
          isMut: false;
          isSigner: false;
        },
        {
          name: "tokenMinter";
          isMut: false;
          isSigner: false;
        },
        {
          name: "localToken";
          isMut: true;
          isSigner: false;
        },
        {
          name: "tokenPair";
          isMut: false;
          isSigner: false;
        },
        {
          name: "feeRecipientTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "recipientTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "custodyTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "tokenProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "eventAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "program";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "params";
          type: {
            defined: "HandleReceiveMessageParams";
          };
        }
      ];
    },
    {
      name: "initialize";
      accounts: [
        {
          name: "payer";
          isMut: true;
          isSigner: true;
        },
        {
          name: "upgradeAuthority";
          isMut: false;
          isSigner: true;
        },
        {
          name: "authorityPda";
          isMut: false;
          isSigner: false;
        },
        {
          name: "tokenMessenger";
          isMut: true;
          isSigner: false;
        },
        {
          name: "tokenMinter";
          isMut: true;
          isSigner: false;
        },
        {
          name: "tokenMessengerMinterProgramData";
          isMut: false;
          isSigner: false;
        },
        {
          name: "tokenMessengerMinterProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "eventAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "program";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "params";
          type: {
            defined: "InitializeParams";
          };
        }
      ];
    },
    {
      name: "linkTokenPair";
      accounts: [
        {
          name: "payer";
          isMut: true;
          isSigner: true;
        },
        {
          name: "tokenController";
          isMut: false;
          isSigner: true;
        },
        {
          name: "tokenMinter";
          isMut: false;
          isSigner: false;
        },
        {
          name: "tokenPair";
          isMut: true;
          isSigner: false;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "eventAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "program";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "params";
          type: {
            defined: "LinkTokenPairParams";
          };
        }
      ];
    },
    {
      name: "pause";
      accounts: [
        {
          name: "pauser";
          isMut: false;
          isSigner: true;
        },
        {
          name: "tokenMinter";
          isMut: true;
          isSigner: false;
        },
        {
          name: "eventAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "program";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "params";
          type: {
            defined: "PauseParams";
          };
        }
      ];
    },
    {
      name: "removeLocalToken";
      accounts: [
        {
          name: "payee";
          isMut: true;
          isSigner: true;
        },
        {
          name: "tokenController";
          isMut: false;
          isSigner: true;
        },
        {
          name: "tokenMinter";
          isMut: false;
          isSigner: false;
        },
        {
          name: "localToken";
          isMut: true;
          isSigner: false;
        },
        {
          name: "custodyTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "custodyTokenMint";
          isMut: true;
          isSigner: false;
        },
        {
          name: "tokenProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "eventAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "program";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "params";
          type: {
            defined: "RemoveLocalTokenParams";
          };
        }
      ];
    },
    {
      name: "removeRemoteTokenMessenger";
      accounts: [
        {
          name: "payee";
          isMut: true;
          isSigner: true;
        },
        {
          name: "owner";
          isMut: false;
          isSigner: true;
        },
        {
          name: "tokenMessenger";
          isMut: false;
          isSigner: false;
        },
        {
          name: "remoteTokenMessenger";
          isMut: true;
          isSigner: false;
        },
        {
          name: "eventAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "program";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "params";
          type: {
            defined: "RemoveRemoteTokenMessengerParams";
          };
        }
      ];
    },
    {
      name: "setFeeRecipient";
      accounts: [
        {
          name: "owner";
          isMut: false;
          isSigner: true;
        },
        {
          name: "tokenMessenger";
          isMut: true;
          isSigner: false;
        },
        {
          name: "eventAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "program";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "params";
          type: {
            defined: "SetFeeRecipientParams";
          };
        }
      ];
    },
    {
      name: "setMaxBurnAmountPerMessage";
      accounts: [
        {
          name: "tokenController";
          isMut: false;
          isSigner: true;
        },
        {
          name: "tokenMinter";
          isMut: false;
          isSigner: false;
        },
        {
          name: "localToken";
          isMut: true;
          isSigner: false;
        },
        {
          name: "eventAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "program";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "params";
          type: {
            defined: "SetMaxBurnAmountPerMessageParams";
          };
        }
      ];
    },
    {
      name: "setMinFee";
      accounts: [
        {
          name: "minFeeController";
          isMut: false;
          isSigner: true;
        },
        {
          name: "tokenMessenger";
          isMut: true;
          isSigner: false;
        },
        {
          name: "eventAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "program";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "params";
          type: {
            defined: "SetMinFeeParams";
          };
        }
      ];
    },
    {
      name: "setMinFeeController";
      accounts: [
        {
          name: "owner";
          isMut: false;
          isSigner: true;
        },
        {
          name: "tokenMessenger";
          isMut: true;
          isSigner: false;
        },
        {
          name: "eventAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "program";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "params";
          type: {
            defined: "SetMinFeeControllerParams";
          };
        }
      ];
    },
    {
      name: "setTokenController";
      accounts: [
        {
          name: "owner";
          isMut: false;
          isSigner: true;
        },
        {
          name: "tokenMessenger";
          isMut: false;
          isSigner: false;
        },
        {
          name: "tokenMinter";
          isMut: true;
          isSigner: false;
        },
        {
          name: "eventAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "program";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "params";
          type: {
            defined: "SetTokenControllerParams";
          };
        }
      ];
    },
    {
      name: "transferOwnership";
      accounts: [
        {
          name: "owner";
          isMut: false;
          isSigner: true;
        },
        {
          name: "tokenMessenger";
          isMut: true;
          isSigner: false;
        },
        {
          name: "eventAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "program";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "params";
          type: {
            defined: "TransferOwnershipParams";
          };
        }
      ];
    },
    {
      name: "undenylistAccount";
      accounts: [
        {
          name: "payer";
          isMut: true;
          isSigner: true;
        },
        {
          name: "denylister";
          isMut: false;
          isSigner: true;
        },
        {
          name: "tokenMessenger";
          isMut: false;
          isSigner: false;
        },
        {
          name: "denylistAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "eventAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "program";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "params";
          type: {
            defined: "UndenylistParams";
          };
        }
      ];
    },
    {
      name: "unlinkTokenPair";
      accounts: [
        {
          name: "payee";
          isMut: true;
          isSigner: true;
        },
        {
          name: "tokenController";
          isMut: false;
          isSigner: true;
        },
        {
          name: "tokenMinter";
          isMut: false;
          isSigner: false;
        },
        {
          name: "tokenPair";
          isMut: true;
          isSigner: false;
        },
        {
          name: "eventAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "program";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "params";
          type: {
            defined: "UnlinkTokenPairParams";
          };
        }
      ];
    },
    {
      name: "unpause";
      accounts: [
        {
          name: "pauser";
          isMut: false;
          isSigner: true;
        },
        {
          name: "tokenMinter";
          isMut: true;
          isSigner: false;
        },
        {
          name: "eventAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "program";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "params";
          type: {
            defined: "UnpauseParams";
          };
        }
      ];
    },
    {
      name: "updateDenylister";
      accounts: [
        {
          name: "owner";
          isMut: false;
          isSigner: true;
        },
        {
          name: "tokenMessenger";
          isMut: true;
          isSigner: false;
        },
        {
          name: "eventAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "program";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "params";
          type: {
            defined: "UpdateDenylisterParams";
          };
        }
      ];
    },
    {
      name: "updatePauser";
      accounts: [
        {
          name: "owner";
          isMut: false;
          isSigner: true;
        },
        {
          name: "tokenMessenger";
          isMut: false;
          isSigner: false;
        },
        {
          name: "tokenMinter";
          isMut: true;
          isSigner: false;
        },
        {
          name: "eventAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "program";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "params";
          type: {
            defined: "UpdatePauserParams";
          };
        }
      ];
    }
  ];
  accounts: [
    {
      name: "DenylistedAccount";
      type: {
        kind: "struct";
        fields: [
          {
            name: "account";
            type: "publicKey";
          }
        ];
      };
    },
    {
      name: "LocalToken";
      type: {
        kind: "struct";
        fields: [
          {
            name: "custody";
            type: "publicKey";
          },
          {
            name: "mint";
            type: "publicKey";
          },
          {
            name: "burnLimitPerMessage";
            type: "u64";
          },
          {
            name: "messagesSent";
            type: "u64";
          },
          {
            name: "messagesReceived";
            type: "u64";
          },
          {
            name: "amountSent";
            type: "u128";
          },
          {
            name: "amountReceived";
            type: "u128";
          },
          {
            name: "bump";
            type: "u8";
          },
          {
            name: "custodyBump";
            type: "u8";
          }
        ];
      };
    },
    {
      name: "MessageTransmitter";
      type: {
        kind: "struct";
        fields: [
          {
            name: "owner";
            type: "publicKey";
          },
          {
            name: "pendingOwner";
            type: "publicKey";
          },
          {
            name: "attesterManager";
            type: "publicKey";
          },
          {
            name: "pauser";
            type: "publicKey";
          },
          {
            name: "paused";
            type: "bool";
          },
          {
            name: "localDomain";
            type: "u32";
          },
          {
            name: "version";
            type: "u32";
          },
          {
            name: "signatureThreshold";
            type: "u32";
          },
          {
            name: "enabledAttesters";
            type: {
              vec: "publicKey";
            };
          },
          {
            name: "maxMessageBodySize";
            type: "u64";
          }
        ];
      };
    },
    {
      name: "RemoteTokenMessenger";
      type: {
        kind: "struct";
        fields: [
          {
            name: "domain";
            type: "u32";
          },
          {
            name: "tokenMessenger";
            type: "publicKey";
          }
        ];
      };
    },
    {
      name: "tokenMessenger";
      type: {
        kind: "struct";
        fields: [
          {
            name: "denylister";
            type: "publicKey";
          },
          {
            name: "owner";
            type: "publicKey";
          },
          {
            name: "pendingOwner";
            type: "publicKey";
          },
          {
            name: "messageBodyVersion";
            type: "u32";
          },
          {
            name: "authorityBump";
            type: "u8";
          },
          {
            name: "feeRecipient";
            type: "publicKey";
          },
          {
            name: "minFeeController";
            type: "publicKey";
          },
          {
            name: "minFee";
            type: "u32";
          }
        ];
      };
    },
    {
      name: "TokenMinter";
      type: {
        kind: "struct";
        fields: [
          {
            name: "tokenController";
            type: "publicKey";
          },
          {
            name: "pauser";
            type: "publicKey";
          },
          {
            name: "paused";
            type: "bool";
          },
          {
            name: "bump";
            type: "u8";
          }
        ];
      };
    },
    {
      name: "TokenPair";
      type: {
        kind: "struct";
        fields: [
          {
            name: "remoteDomain";
            type: "u32";
          },
          {
            name: "remoteToken";
            type: "publicKey";
          },
          {
            name: "localToken";
            type: "publicKey";
          },
          {
            name: "bump";
            type: "u8";
          }
        ];
      };
    }
  ];
  events: [
    {
      name: "Denylisted";
      fields: [
        {
          name: "account";
          type: "publicKey";
          index: false;
        }
      ];
    },
    {
      name: "DenylisterChanged";
      fields: [
        {
          name: "oldDenylister";
          type: "publicKey";
          index: false;
        },
        {
          name: "newDenylister";
          type: "publicKey";
          index: false;
        }
      ];
    },
    {
      name: "DepositForBurn";
      fields: [
        {
          name: "burnToken";
          type: "publicKey";
          index: false;
        },
        {
          name: "amount";
          type: "u64";
          index: false;
        },
        {
          name: "depositor";
          type: "publicKey";
          index: false;
        },
        {
          name: "mintRecipient";
          type: "publicKey";
          index: false;
        },
        {
          name: "destinationDomain";
          type: "u32";
          index: false;
        },
        {
          name: "destinationTokenMessenger";
          type: "publicKey";
          index: false;
        },
        {
          name: "destinationCaller";
          type: "publicKey";
          index: false;
        },
        {
          name: "maxFee";
          type: "u64";
          index: false;
        },
        {
          name: "minFinalityThreshold";
          type: "u32";
          index: false;
        },
        {
          name: "hookData";
          type: "bytes";
          index: false;
        }
      ];
    },
    {
      name: "FeeRecipientSet";
      fields: [
        {
          name: "newFeeRecipient";
          type: "publicKey";
          index: false;
        }
      ];
    },
    {
      name: "LocalTokenAdded";
      fields: [
        {
          name: "custody";
          type: "publicKey";
          index: false;
        },
        {
          name: "mint";
          type: "publicKey";
          index: false;
        }
      ];
    },
    {
      name: "LocalTokenRemoved";
      fields: [
        {
          name: "custody";
          type: "publicKey";
          index: false;
        },
        {
          name: "mint";
          type: "publicKey";
          index: false;
        }
      ];
    },
    {
      name: "MinFeeControllerSet";
      fields: [
        {
          name: "newMinFeeController";
          type: "publicKey";
          index: false;
        }
      ];
    },
    {
      name: "MinFeeSet";
      fields: [
        {
          name: "newMinFee";
          type: "u32";
          index: false;
        }
      ];
    },
    {
      name: "MintAndWithdraw";
      fields: [
        {
          name: "mintRecipient";
          type: "publicKey";
          index: false;
        },
        {
          name: "amount";
          type: "u64";
          index: false;
        },
        {
          name: "mintToken";
          type: "publicKey";
          index: false;
        },
        {
          name: "feeCollected";
          type: "u64";
          index: false;
        }
      ];
    },
    {
      name: "OwnershipTransferStarted";
      fields: [
        {
          name: "previousOwner";
          type: "publicKey";
          index: false;
        },
        {
          name: "newOwner";
          type: "publicKey";
          index: false;
        }
      ];
    },
    {
      name: "OwnershipTransferred";
      fields: [
        {
          name: "previousOwner";
          type: "publicKey";
          index: false;
        },
        {
          name: "newOwner";
          type: "publicKey";
          index: false;
        }
      ];
    },
    {
      name: "Pause";
      fields: [];
    },
    {
      name: "PauserChanged";
      fields: [
        {
          name: "newAddress";
          type: "publicKey";
          index: false;
        }
      ];
    },
    {
      name: "RemoteTokenMessengerAdded";
      fields: [
        {
          name: "domain";
          type: "u32";
          index: false;
        },
        {
          name: "tokenMessenger";
          type: "publicKey";
          index: false;
        }
      ];
    },
    {
      name: "RemoteTokenMessengerRemoved";
      fields: [
        {
          name: "domain";
          type: "u32";
          index: false;
        },
        {
          name: "tokenMessenger";
          type: "publicKey";
          index: false;
        }
      ];
    },
    {
      name: "SetBurnLimitPerMessage";
      fields: [
        {
          name: "token";
          type: "publicKey";
          index: false;
        },
        {
          name: "burnLimitPerMessage";
          type: "u64";
          index: false;
        }
      ];
    },
    {
      name: "SetTokenController";
      fields: [
        {
          name: "tokenController";
          type: "publicKey";
          index: false;
        }
      ];
    },
    {
      name: "TokenCustodyBurned";
      fields: [
        {
          name: "custodyTokenAccount";
          type: "publicKey";
          index: false;
        },
        {
          name: "amount";
          type: "u64";
          index: false;
        }
      ];
    },
    {
      name: "TokenPairLinked";
      fields: [
        {
          name: "localToken";
          type: "publicKey";
          index: false;
        },
        {
          name: "remoteDomain";
          type: "u32";
          index: false;
        },
        {
          name: "remoteToken";
          type: "publicKey";
          index: false;
        }
      ];
    },
    {
      name: "TokenPairUnlinked";
      fields: [
        {
          name: "localToken";
          type: "publicKey";
          index: false;
        },
        {
          name: "remoteDomain";
          type: "u32";
          index: false;
        },
        {
          name: "remoteToken";
          type: "publicKey";
          index: false;
        }
      ];
    },
    {
      name: "UnDenylisted";
      fields: [
        {
          name: "account";
          type: "publicKey";
          index: false;
        }
      ];
    },
    {
      name: "Unpause";
      fields: [];
    }
  ];
  errors: [
    {
      code: 6000;
      name: "InvalidAuthority";
      msg: "Invalid authority";
    },
    {
      code: 6001;
      name: "InvalidTokenMinterState";
      msg: "Invalid token minter state";
    },
    {
      code: 6002;
      name: "ProgramPaused";
      msg: "Instruction is not allowed at this time";
    },
    {
      code: 6003;
      name: "InvalidTokenPairState";
      msg: "Invalid token pair state";
    },
    {
      code: 6004;
      name: "InvalidLocalTokenState";
      msg: "Invalid local token state";
    },
    {
      code: 6005;
      name: "InvalidPauser";
      msg: "Invalid pauser";
    },
    {
      code: 6006;
      name: "InvalidTokenController";
      msg: "Invalid token controller";
    },
    {
      code: 6007;
      name: "BurnAmountExceeded";
      msg: "Burn amount exceeded";
    },
    {
      code: 6008;
      name: "InvalidAmount";
      msg: "Invalid amount";
    }
  ];
  types: [
    {
      name: "AcceptOwnershipParams";
      type: {
        kind: "struct";
        fields: [];
      };
    },
    {
      name: "AddLocalTokenParams";
      type: {
        kind: "struct";
        fields: [];
      };
    },
    {
      name: "AddRemoteTokenMessengerParams";
      type: {
        kind: "struct";
        fields: [
          {
            name: "domain";
            type: "u32";
          },
          {
            name: "tokenMessenger";
            type: "publicKey";
          }
        ];
      };
    },
    {
      name: "BurnTokenCustodyParams";
      type: {
        kind: "struct";
        fields: [
          {
            name: "amount";
            type: "u64";
          }
        ];
      };
    },
    {
      name: "DenylistParams";
      type: {
        kind: "struct";
        fields: [
          {
            name: "account";
            type: "publicKey";
          }
        ];
      };
    },
    {
      name: "DepositForBurnParams";
      type: {
        kind: "struct";
        fields: [
          {
            name: "amount";
            type: "u64";
          },
          {
            name: "destinationDomain";
            type: "u32";
          },
          {
            name: "mintRecipient";
            type: "publicKey";
          },
          {
            name: "destinationCaller";
            type: "publicKey";
          },
          {
            name: "maxFee";
            type: "u64";
          },
          {
            name: "minFinalityThreshold";
            type: "u32";
          }
        ];
      };
    },
    {
      name: "DepositForBurnWithHookParams";
      type: {
        kind: "struct";
        fields: [
          {
            name: "amount";
            type: "u64";
          },
          {
            name: "destinationDomain";
            type: "u32";
          },
          {
            name: "mintRecipient";
            type: "publicKey";
          },
          {
            name: "destinationCaller";
            type: "publicKey";
          },
          {
            name: "maxFee";
            type: "u64";
          },
          {
            name: "minFinalityThreshold";
            type: "u32";
          },
          {
            name: "hookData";
            type: "bytes";
          }
        ];
      };
    },
    {
      name: "HandleReceiveMessageParams";
      type: {
        kind: "struct";
        fields: [
          {
            name: "remoteDomain";
            type: "u32";
          },
          {
            name: "sender";
            type: "publicKey";
          },
          {
            name: "finalityThresholdExecuted";
            type: "u32";
          },
          {
            name: "messageBody";
            type: "bytes";
          },
          {
            name: "authorityBump";
            type: "u8";
          }
        ];
      };
    },
    {
      name: "InitializeParams";
      type: {
        kind: "struct";
        fields: [
          {
            name: "tokenController";
            type: "publicKey";
          },
          {
            name: "denylister";
            type: "publicKey";
          },
          {
            name: "feeRecipient";
            type: "publicKey";
          },
          {
            name: "minFeeController";
            type: "publicKey";
          },
          {
            name: "minFee";
            type: "u32";
          },
          {
            name: "messageBodyVersion";
            type: "u32";
          }
        ];
      };
    },
    {
      name: "LinkTokenPairParams";
      type: {
        kind: "struct";
        fields: [
          {
            name: "localToken";
            type: "publicKey";
          },
          {
            name: "remoteDomain";
            type: "u32";
          },
          {
            name: "remoteToken";
            type: "publicKey";
          }
        ];
      };
    },
    {
      name: "PauseParams";
      type: {
        kind: "struct";
        fields: [];
      };
    },
    {
      name: "RemoveLocalTokenParams";
      type: {
        kind: "struct";
        fields: [];
      };
    },
    {
      name: "RemoveRemoteTokenMessengerParams";
      type: {
        kind: "struct";
        fields: [];
      };
    },
    {
      name: "SetFeeRecipientParams";
      type: {
        kind: "struct";
        fields: [
          {
            name: "newFeeRecipient";
            type: "publicKey";
          }
        ];
      };
    },
    {
      name: "SetMaxBurnAmountPerMessageParams";
      type: {
        kind: "struct";
        fields: [
          {
            name: "burnLimitPerMessage";
            type: "u64";
          }
        ];
      };
    },
    {
      name: "SetMinFeeControllerParams";
      type: {
        kind: "struct";
        fields: [
          {
            name: "newMinFeeController";
            type: "publicKey";
          }
        ];
      };
    },
    {
      name: "SetMinFeeParams";
      type: {
        kind: "struct";
        fields: [
          {
            name: "newMinFee";
            type: "u32";
          }
        ];
      };
    },
    {
      name: "SetTokenControllerParams";
      type: {
        kind: "struct";
        fields: [
          {
            name: "tokenController";
            type: "publicKey";
          }
        ];
      };
    },
    {
      name: "TransferOwnershipParams";
      type: {
        kind: "struct";
        fields: [
          {
            name: "newOwner";
            type: "publicKey";
          }
        ];
      };
    },
    {
      name: "UndenylistParams";
      type: {
        kind: "struct";
        fields: [
          {
            name: "account";
            type: "publicKey";
          }
        ];
      };
    },
    {
      name: "UnlinkTokenPairParams";
      type: {
        kind: "struct";
        fields: [];
      };
    },
    {
      name: "UnpauseParams";
      type: {
        kind: "struct";
        fields: [];
      };
    },
    {
      name: "UpdateDenylisterParams";
      type: {
        kind: "struct";
        fields: [
          {
            name: "newDenylister";
            type: "publicKey";
          }
        ];
      };
    },
    {
      name: "UpdatePauserParams";
      type: {
        kind: "struct";
        fields: [
          {
            name: "newPauser";
            type: "publicKey";
          }
        ];
      };
    }
  ];
};
