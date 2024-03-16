import React, { useState, useRef, useEffect } from "react";
import { FaFacebookMessenger } from "react-icons/fa";
import ACTIONS from "../Actions";
import Client from "../components/Client";
import Editor from "../components/Editor";
import { initSocket } from "../socket";
import {
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { toast } from "react-hot-toast";
import axios from "axios";

const EditorPage = () => {
  const socketRef = useRef(null);
  const codeRef = useRef(null);
  const location = useLocation();
  const reactNavigator = useNavigate();
  const { roomId } = useParams();
  const [clients, setClients] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("17"); // Default value set to "17" for JavaScript
  const [isChatOpen, setIsChatOpen] = useState(false); // Default value set to "17" for JavaScript

  useEffect(() => {
    const init = async () => {
      socketRef.current = await initSocket();

      socketRef.current.on("connect_error", (err) => handleErrors(err));
      socketRef.current.on("connect_failed", (err) => handleErrors(err));

      function handleErrors(e) {
        console.log("socket error", e);
        toast.error("Socket connection failed, try again later.");
        reactNavigator("/");
      }

      socketRef.current.emit(ACTIONS.JOIN, {
        roomId,
        username: location.state?.username,
      });

      //Listening for joined event
      socketRef.current.on(
        ACTIONS.JOINED,
        ({ clients, username, socketId }) => {
          if (username !== location.state?.username) {
            toast.success(`${username} joined the room.`);
            console.log(`${username} joined`);
          }
          setClients(clients);
          socketRef.current.emit(ACTIONS.SYNC_CODE, {
            code: codeRef.current,
            socketId,
          });
        }
      );

      //Listeing for disconnected
      socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
        toast.success(`${username} left the room.`);
        setClients((prev) => {
          return prev.filter((client) => client.socketId !== socketId);
        });
      });

      //Listening for message
      socketRef.current.on(ACTIONS.SEND_MESSAGE, ({ message }) => {
        const chatWindow = document.getElementById("chatWindow");
        var currText = chatWindow.value;
        currText += message;
        chatWindow.value = currText;
        chatWindow.scrollTop = chatWindow.scrollHeight;
      });
    };
    init();
    return () => {
      socketRef.current.off(ACTIONS.JOINED);
      socketRef.current.off(ACTIONS.DISCONNECTED);
      socketRef.current.off(ACTIONS.SEND_MESSAGE);
      socketRef.current.disconnect();
    };
  }, []);

  async function copyRoomId() {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success("Room ID has been copied to your clipboard");
    } catch (err) {
      toast.error("Could not copy the room id");
      console.error(err);
    }
  }

  function leaveRoom() {
    reactNavigator("/");
  }

  if (!location.state) {
    return <Navigate to="/" />;
  }

  const inputClicked = () => {
    const inputArea = document.getElementById("input");
    inputArea.placeholder = "Enter your input here";
    inputArea.value = "";
    inputArea.disabled = false;
    const inputLabel = document.getElementById("inputLabel");
    const outputLabel = document.getElementById("outputLabel");
    inputLabel.classList.remove("bg-gray-600");
    inputLabel.classList.add("bg-violet-600");
    outputLabel.classList.add("bg-gray-600");
    outputLabel.classList.remove("bg-violet-600");
  };

  const outputClicked = () => {
    const inputArea = document.getElementById("input");
    inputArea.placeholder =
      "You output will apear here, Click 'Run code' to see it";
    inputArea.value = "";
    inputArea.disabled = true;
    const inputLabel = document.getElementById("inputLabel");
    const outputLabel = document.getElementById("outputLabel");
    inputLabel.classList.add("bg-gray-600");
    inputLabel.classList.remove("bg-violet-600");
    outputLabel.classList.remove("bg-gray-600");
    outputLabel.classList.add("bg-violet-600");
  };

  const runCode = () => {
    const lang = selectedLanguage;
    if (!lang) {
      alert("Select a langauge");
      return;
    }
    const input = document.getElementById("input").value;

    const code = codeRef.current;
    if (!code?.trim()) {
      toast.error("Input code can't be empty!");
      return;
    }

    toast.loading("Running Code....");

    const encodedParams = new URLSearchParams();
    encodedParams.append("LanguageChoice", lang);
    encodedParams.append("Program", code);
    encodedParams.append("Input", input);

    const options = {
      method: "POST",
      url: "https://code-compiler.p.rapidapi.com/v2",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "X-RapidAPI-Key": "5b043e0a52mshb9b678342220f20p197e9ejsn73822ed353ab",
        "X-RapidAPI-Host": "code-compiler.p.rapidapi.com",
      },
      data: encodedParams,
    };

    axios
      .request(options)
      .then(function (response) {
        let message = response.data.Result;
        if (message === null) {
          message = response.data.Errors;
        }
        outputClicked();
        document.getElementById("input").value = message;
        toast.dismiss();
        toast.success("Code compilation complete");
      })
      .catch(function (error) {
        toast.dismiss();
        toast.error("Code compilation unsuccessful");
        document.getElementById("input").value =
          "Something went wrong, Please check your code and input.";
      });
  };

  const sendMessage = () => {
    if (document.getElementById("inputBox").value === "") return;
    var message = `> ${location.state.username}:\n${
      document.getElementById("inputBox").value
    }\n`;
    const chatWindow = document.getElementById("chatWindow");
    var currText = chatWindow.value;
    currText += message;
    chatWindow.value = currText;
    chatWindow.scrollTop = chatWindow.scrollHeight;
    document.getElementById("inputBox").value = "";
    socketRef.current.emit(ACTIONS.SEND_MESSAGE, { roomId, message });
  };

  const handleInputEnter = (key) => {
    if (key.code === "Enter") {
      sendMessage();
    }
  };

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="mainWrap">
      {/* Navbar */}
      <nav className="mx-2 flex justify-between">
        <div className="logo">
          <img className="logoImage" src="/code-sync.png" alt="logo" />
        </div>
        <div className="flex justify-center items-center">
          <button
            className="text-white scale-150"
            onClick={() => setIsChatOpen(!isChatOpen)}
          >
            <FaFacebookMessenger height={48}/>
          </button>
          <button
            data-drawer-target="default-sidebar"
            data-drawer-toggle="default-sidebar"
            aria-controls="default-sidebar"
            type="button"
            className="inline-flex items-center p-2 mt-2 ms-3 text-sm text-gray-500 rounded-lg sm:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600"
            onClick={toggleSidebar}
          >
            <span className="sr-only">Open sidebar</span>
            {!isOpen ? (
              <svg
                className="w-6 h-6"
                aria-hidden="true"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z"></path>
              </svg>
            ) : (
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            )}
          </button>
        </div>
      </nav>

      <div>
        {isOpen ? (
          <div className="z-10 absolute p-3 bg-gray-700 w-full shadow-md rounded-md">
            <div className="asideInner">
              <h3 className="font-bold text-white text-lg">Connected</h3>
              <div className="clientsList">
                {clients.map((client) => (
                  <Client key={client.socketId} username={client.username} />
                ))}
              </div>
            </div>

            {/* Disable comments to display language options  */}
            <label>
              <span className="text-lg text-white font-bold mt-2">
                Select Language:
              </span>
              <select
                id="languageOptions"
                className="seLang"
                defaultValue={selectedLanguage}
                onChange={(event) => setSelectedLanguage(event.target.value)}
              >
                <option value="1">C#</option>
                <option value="4">Java</option>
                <option value="5">Python</option>
                <option value="6">C (gcc)</option>
                <option value="7">C++ (gcc)</option>
                <option value="8">PHP</option>
                <option value="17">Javascript</option>
                <option value="43">Kotlin</option>
                <option value="60">TypeScript</option>
              </select>
            </label>
            <button className="btn copyBtn" onClick={copyRoomId}>
              Copy ROOM ID
            </button>
            <button className="btn leaveBtn" onClick={leaveRoom}>
              Leave
            </button>
          </div>
        ) : (
          ""
        )}
      </div>
      <div className="editorWrap shadow-md  rounded-md">
        <Editor
          socketRef={socketRef}
          roomId={roomId}
          onCodeChange={(code) => {
            codeRef.current = code;
          }}
        />

        {/* Remove comment to display input output and run code button */}
        <div className=" flex items-center justify-between">
          <div>
            <label
              id="inputLabel"
              className="bg-violet-600 px-4 py-1  m-1 text-white font-bold rounded-md"
              onClick={inputClicked}
            >
              Input
            </label>
            <label
              id="outputLabel"
              className="bg-gray-600 px-4 py-1  m-1 text-white font-bold rounded-md"
              onClick={outputClicked}
            >
              Output
            </label>
          </div>
          <button
            className="bg-violet-600 px-4 py-1  m-1 text-white font-bold rounded-md"
            onClick={runCode}
          >
            Run Code
          </button>
        </div>
        <textarea
          id="input"
          className="inputArea textarea-style border border-white rounded-md shadow-md p-2 outline-none"
          placeholder="Enter your input here"
          rows={3}
        ></textarea>
      </div>

      {/* Disable comment to enable chat feature */}
      <div
        className={`flex flex-col overflow-hidden ${
          isChatOpen ? "max-h-svh" : "max-h-0"
        } duration-300 absolute top-16 transition-all w-full bg-gray-900`}
      >
        <textarea
          id="chatWindow"
          className="chatArea textarea-style p-2 border-white rounded-md"
          placeholder="Chat messages will appear here"
          disabled
        ></textarea>
        <div className="flex justify-between w-full px-2 py-1">
          <input
            id="inputBox"
            type="text"
            placeholder="Type your message here"
            className="w-full px-1 mx-1 rounded-md shadow-md"
            onKeyUp={handleInputEnter}
          ></input>
          <button
            className="btn text-white bg-violet-600"
            onClick={sendMessage}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditorPage;
