import { useLocation } from "react-router-dom";
function Test1() {
  const location = useLocation();
  const userName = location.state?.userName;

  return (
    <>
      <h1>this is test1</h1>
      <p>{userName}</p>
    </>
  );
}
export default Test1;
