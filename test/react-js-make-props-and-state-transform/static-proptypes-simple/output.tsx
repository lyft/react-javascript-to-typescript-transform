import * as React from 'react';
type MyComponentProps = {
    foo: string,
};
export default class MyComponent extends React.Component<MyComponentProps, {}> {
    static propTypes = {
        foo: React.PropTypes.string.isRequired,
    };
    render() {
        return <div />;
    }
}
