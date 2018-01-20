const Hello = ({ message }) => {
  return <div>hello {message}</div>
};

Hello.propTypes = {
  message: React.PropTypes.string,
}
