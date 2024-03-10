import React from "react";
import Avatar from "react-avatar";

const Client = ({ username }) => {
  return (
    <div className="client bg-white p-2 rounded-md mx-1">
      <Avatar name={username} size={50} round="14px" />
      <span className="userName">{username}</span>
    </div>
  );
};

export default Client;
