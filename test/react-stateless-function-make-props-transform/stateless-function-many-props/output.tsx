import * as React from 'react';
type MyComponentProps = {
    any?: any;
    array?: any[];
    bool?: boolean;
    func?: (...args: any[]) => any;
    number?: number;
    object?: object;
    string?: string;
    node?: React.ReactNode;
    element?: JSX.Element;
    oneOf?: 'a' | 'b' | 'c';
    oneOfType?: string | number;
    arrayOf?: string[];
    objectOf?: {
        [key: string]: string;
    };
    shape?: {
        color?: string;
        fontSize?: number;
    };
    anyRequired: any;
    arrayRequired: any[];
    boolRequired: boolean;
    funcRequired: (...args: any[]) => any;
    numberRequired: number;
    objectRequired: object;
    stringRequired: string;
    nodeRequired: React.ReactNode;
    elementRequired: JSX.Element;
    oneOfRequired: 'a' | 'b' | 'c';
    oneOfTypeRequired: string | number;
    arrayOfRequired: string[];
    objectOfRequired: {
        [key: string]: string;
    };
    shapeRequired: {
        color?: string;
        fontSize: number;
    };
};
const MyComponent: React.SFC<MyComponentProps> = () => {
    return <div />;
};
MyComponent.propTypes = {
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
    oneOf: React.PropTypes.oneOf(['a', 'b', 'c']),
    oneOfType: React.PropTypes.oneOfType([
        React.PropTypes.string,
        React.PropTypes.number,
    ]),
    arrayOf: React.PropTypes.arrayOf(React.PropTypes.string),
    objectOf: React.PropTypes.objectOf(React.PropTypes.string),
    shape: React.PropTypes.shape({
        color: React.PropTypes.string,
        fontSize: React.PropTypes.number,
    }),
    anyRequired: React.PropTypes.any.isRequired,
    arrayRequired: React.PropTypes.array.isRequired,
    boolRequired: React.PropTypes.bool.isRequired,
    funcRequired: React.PropTypes.func.isRequired,
    numberRequired: React.PropTypes.number.isRequired,
    objectRequired: React.PropTypes.object.isRequired,
    stringRequired: React.PropTypes.string.isRequired,
    nodeRequired: React.PropTypes.node.isRequired,
    elementRequired: React.PropTypes.element.isRequired,
    oneOfRequired: React.PropTypes.oneOf(['a', 'b', 'c']).isRequired,
    oneOfTypeRequired: React.PropTypes.oneOfType([
        React.PropTypes.string,
        React.PropTypes.number,
    ]).isRequired,
    arrayOfRequired: React.PropTypes.arrayOf(React.PropTypes.string).isRequired,
    objectOfRequired: React.PropTypes.objectOf(React.PropTypes.string).isRequired,
    shapeRequired: React.PropTypes.shape({
        color: React.PropTypes.string,
        fontSize: React.PropTypes.number.isRequired,
    }).isRequired,
};
