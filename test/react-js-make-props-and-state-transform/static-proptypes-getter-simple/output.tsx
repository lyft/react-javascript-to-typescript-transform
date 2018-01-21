import * as React from 'react';
type MyComponentProps = {
    foo: string,
};
export default class MyComponent extends React.Component<MyComponentProps, {}> {
    static get propTypes() {
        return {
            foo: React.PropTypes.string.isRequired,
        };
    }
    render() {
        return <div />;
    }
}
