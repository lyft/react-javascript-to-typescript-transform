const Hello = ({ message }) => {
  return <div>hello {message}</div>
};

function Hey({ name }) {
  return <div>hey, {name}</div>
}

Hey.propTypes = {
  name: React.PropTypes.string.isRequired,
}

Hello.propTypes = {
  message: React.PropTypes.string,
}
