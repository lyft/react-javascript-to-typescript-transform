import * as React from 'react';

export default class MyComponent extends React.Component<{
        any?: any;
        array?: any[];
        bool?: boolean;
        func?: (...args: any[]) => any;
        number?: number;
        object?: object;
        string?: string;
        node?: React.ReactNode;
        element?: JSX.Element;
        anyRequired: any;
        arrayRequired: any[];
        boolRequired: boolean;
        funcRequired: (...args: any[]) => any;
        numberRequired: number;
        objectRequired: object;
        stringRequired: string;
        nodeRequired: React.ReactNode;
        elementRequired: JSX.Element;
    }, {}> {
    static propTypes = {
        children: React.PropTypes.node,
        any: React.PropTypes.any,
        array: React.PropTypes.array,
        bool: React.PropTypes.bool,
        func: React.PropTypes.func,
        number: React.PropTypes.number,
        object: React.PropTypes.object,
        string: React.PropTypes.string,
        node: React.PropTypes.node,
        element: React.PropTypes.element,
        anyRequired: React.PropTypes.any.isRequired,
        arrayRequired: React.PropTypes.array.isRequired,
        boolRequired: React.PropTypes.bool.isRequired,
        funcRequired: React.PropTypes.func.isRequired,
        numberRequired: React.PropTypes.number.isRequired,
        objectRequired: React.PropTypes.object.isRequired,
        stringRequired: React.PropTypes.string.isRequired,
        nodeRequired: React.PropTypes.node.isRequired,
        elementRequired: React.PropTypes.element.isRequired,
    };
    render() {
        return <div />;
    }
}
