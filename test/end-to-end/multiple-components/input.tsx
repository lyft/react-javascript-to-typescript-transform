const Hello = ({ message }) => {
  return <div>hello {message}</div>
};

const Hey = ({ name }) => {
  return <div>hey, {name}</div>
}

Hey.propTypes = {
  message: React.PropTypes.string,
}

Hello.propTypes = {
  message: React.PropTypes.string,
}

export default class MyComponent extends React.Component {
    render() {
        return <button onClick={this.onclick.bind(this)} />;
    }

    onclick() {
        this.setState({foo: 1, bar: 2})
    }
}

export class AnotherComponent extends React.Component {
    static propTypes = {
        foo: React.PropTypes.string.isRequired,
    };
    render() {
        return <div />;
    }
}
