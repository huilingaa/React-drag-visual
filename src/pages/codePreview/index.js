import React, { useState, useEffect } from 'react';
import MonacoEditor from 'react-monaco-editor';
import { connect } from 'dva';
import _ from 'loadsh';
import { message, Modal } from 'antd';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import {
  Button,
  Tag,
  NavBar,
  Icon,
  InputItem,
  SearchBar,
  Result,
} from 'antd-mobile';
import {renderPropsToString} from '@/utils/utils';
import styles from './styles.less';

const GlobalComponent = {
  Button,
  Tag,
  NavBar,
  Icon,
  InputItem,
  SearchBar,
  Result,
};

const codePreview = props => {
  const { dispatch, currentView } = props;
  const [code, setCode] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  const renderReactDom = ({antd, componentName, props}) => {
    if(antd) {
      const Comp = GlobalComponent[componentName];
      return (
        React.createElement(
          Comp,
          props
        )
      )
    }
  }

  /**
   * @description 得到依赖组件
   */
  const dependComponents = () => {
    // 得到对象数组
    const stringCurrentView = JSON.stringify(currentView);
    // 正则
    var regex = /\"type\":\"\w+\"/g;
    // 匹配到所有相关字符串数组
    const StringArr = stringCurrentView.match(regex);
    const newarr = StringArr.map(item => {
      return item.replace(/\"type\":\"(.*?)\"/g, '$1');
    });
    // 数组去重
    const components = [...new Set(newarr)];
    // 当前的依赖list
    const componentsList = [
      'Tag',
      'Button',
      'Div',
      'InputItem',
      'NavBar',
      'Result',
    ];
    // 过滤
    const dependComponents = components.filter(item => {
      return componentsList.includes(item);
    });
    return dependComponents;
  };

  /**
   * @description 渲染成jsx
   */
  const renderJSONtoJSX = () => {
    const arr = dependComponents();
    const dependCom =
      arr.length > 0 ? `import { Icon, ${arr.join(', ')} } from 'antd-mobile';` : '';
    return `
    import React, { Component } from 'react';
    ${dependCom}
  
    class Index extends Component {
      constructor () {
        super();
      }
      render(){
        return (
          <>
              ${renderDom(currentView, 0)}
          </>
        )
      }
    }
    export default Index;
    `;
  };

  /**
   * @description 渲染jsx dom
   * @param {*} data 视图数据
   */
  const renderDom = (data, flag) => {
    let result = ``;
    data.map(item => {
      if (item.children) {
        result += `
          <${item.type} ${renderStyle(item.props.style)}>
          ${renderDom(item.children, 1)}</${item.type}>
          `;
      } else {
        const { props, nodeProps } = item;
        if (flag) {
          result += `    <${item.type}${renderProps(props)} ${renderNodeProps(
            nodeProps,
          )}${renderStyle(props.style)}>${
            props.content ? props.content : ''
          }</${item.type}>
          `;
        } else {
          result += `<${item.type}${renderProps(props)} ${renderNodeProps(
            nodeProps,
          )}${renderStyle(props.style)}>${
            props.content ? props.content : ''
          }</${item.type}>
          `;
        }
      }
    });
    return result;
  };

  /**
   * @description 渲染props
   * @param {*} props props
   */
  const renderProps = props => {
    let propsResult = ``;
    for (const key in props) {
      if (props.hasOwnProperty(key) && key != 'style' && key != 'content') {
        const value = props[key];
        propsResult += ` ${key}="${value}"`;
      }
    }
    return propsResult;
  };

  /**
   * @description 渲染nodeProps
   * @param {*} props props
   */
  const renderNodeProps = props => {
    let nodePropsResult = ``;
    for (const key in props) {
      if (props.hasOwnProperty(key)) {
        const value = props[key];
        const template = value.renderString;
        const params = value.params;
        nodePropsResult += `${key}={${renderPropsToString(template, params)}}`;
      }
    }
    return nodePropsResult;
  };

  /**
   * @description 渲染style
   * @param {*} style style
   */
  const renderStyle = style => {
    let styleResult = ``;
    for (const key in style) {
      if (style.hasOwnProperty(key) && key != 'border' && style[key]) {
        const value = style[key];
        styleResult += `${key}: '${value}'`;
      }
    }
    return styleResult ? `style={{ ${styleResult} }}` : ``;
  };

  useEffect(() => {
    if (currentView.length > 0) {
      const code = renderJSONtoJSX();
      setCode(code);
    } else {
      // 没有currentview
      message.warning('视图为空，所以无法生成代码，建议返回页面');
    }
  }, [currentView]);

  const renderView = (data, index) => {
    return data.map((item, i) => {
      // index
      const indexs = index === '' ? String(i) : `${index}-${i}`;

      // 渲染，有子元素的嵌套的
      if (item.children) {
        let { props: style = {} } = item;
        return (
          <div style={style.style} data-id={indexs} key={_.uniqueId()}>
            {item.children.length > 0
              ? renderView(item.children, indexs)
              : null}
          </div>
        );
      }
      const Comp = GlobalComponent[item.type];
      // 具有特殊属性(ReactNode)
      let ReactNodeProps = {};
      if (item.nodeProps) {
        const nodeProps = item.nodeProps;
        for (const key in nodeProps) {
          var func = eval('('+nodeProps[key].renderFunc+')');
          const params = nodeProps[key].params;
          const reactDomParmas = func(params);
          const domContent = renderReactDom(reactDomParmas);
          ReactNodeProps[key] = domContent;
        }
      }
      let props = {
        'data-id': indexs,
        key: _.uniqueId(),
        ...item.props,
        ...ReactNodeProps,
      };
      if (item.needDiv == true) {
        return (
          <div data-id={indexs} key={_.uniqueId()}>
            {React.createElement(
              Comp,
              props,
              item.props.content ? item.props.content : null,
            )}
          </div>
        );
      } else {
        return React.createElement(
          Comp,
          props,
          item.props.content ? item.props.content : null,
        );
      }
    });
  };

  const getZip = () => {
    setModalVisible(true)
    let payload = {
      code: code,
    };
    let apiUrl = '/api/page/zip';
    fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(res => res.blob())
      .then(blob => {
        setModalVisible(false);
        const filename = `code.zip`;
        const a = document.createElement('a');
        const url = window.URL.createObjectURL(blob);
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
      });
  };

  const options = {
    selectOnLineNumbers: true,
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'row', margin: '20px 40px' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <span onClick={() => getZip()}>生成代码压缩包</span>
          <CopyToClipboard
            text={code}
            onCopy={() => {
              message.success('复制成功');
            }}
            style={{ margin: '0 20px', textAlign: 'right' }}
          >
            <span>复制代码</span>
          </CopyToClipboard>
        </div>
        <MonacoEditor
          width="600"
          height="667"
          language="javascript"
          theme="vs-light"
          value={code}
          options={options}
        />
      </div>
      <div className={styles.phone}>
        <div className={styles.container}>{renderView(currentView, 0)}</div>
      </div>

      <Modal
        visible={modalVisible}
        footer={null}
        closable={false}
      >
        <div>
            正在生成代码压缩包，等待中...
            <div className={styles.progress}></div>
        </div>
      </Modal>
    </div>
  );
};

export default connect(({ drag }) => ({
  currentView: drag.currentView,
}))(codePreview);
